import { client, socialError } from "../social/api";
import type { Workout } from "../activities/model";
import type { GrowingTurf } from "./growth";
import { turfPreview } from "./eligibility";

export type TurfResult = {
  turf_id: string;
  won: boolean;
  extended: boolean;
  revision: number;
  seconds: number;
  target_seconds: number;
  distance_m: number;
};
export type TurfSummary = Omit<GrowingTurf, "route"> & { updated_at: string };
export type TurfScope = "circle" | "mine" | "all";
export type TurfCursor = Pick<TurfSummary, "updated_at" | "id">;
export type TurfPage = { items: TurfSummary[]; next: TurfCursor | null };
const PAGE_SIZE = 20;
const summary = "id,name,owner_id,revision,distance_m,seconds,updated_at";
const profile = "profiles!turfs_owner_id_fkey(display_name)";
// PostgreSQL retains microseconds; Date.parse alone collapses distinct updates.
const timeKey = (value: string) =>
  `${new Date(value).toISOString().slice(0, 19)}.${(value.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0")}`;

export async function loadTurfs(
  userId: string,
  scope: TurfScope,
  cursor: TurfCursor | null = null,
  signal?: AbortSignal,
): Promise<TurfPage> {
  // Filter BEFORE limiting, so newer strangers' zones cannot hide old personal ones.
  const sources =
    scope === "all"
      ? ["all"]
      : scope === "mine"
        ? ["owned", "created"]
        : ["owned", "created", "following"];
  const pages = await Promise.all(
    sources.map(async (source) => {
      const join =
        source === "following"
          ? "profiles!turfs_owner_id_fkey!inner(display_name,follows!follows_following_id_fkey!inner(follower_id))"
          : profile;
      let query = client()
        .from("turfs")
        .select(
          `${summary},${join}${source === "created" ? ",turf_events!inner(actor_id,revision)" : ""}`,
        );
      if (source === "owned") query = query.eq("owner_id", userId);
      if (source === "created")
        query = query
          .eq("turf_events.actor_id", userId)
          .eq("turf_events.revision", 1);
      if (source === "following")
        query = query.eq("profiles.follows.follower_id", userId);
      if (cursor)
        query = query.or(
          `updated_at.lt.${cursor.updated_at},and(updated_at.eq.${cursor.updated_at},id.gt.${cursor.id})`,
        );
      query = query
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .limit(PAGE_SIZE + 1);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TurfSummary[];
    }),
  );
  const items = [...new Map(pages.flat().map((t) => [t.id, t])).values()].sort(
    (a, b) =>
      timeKey(b.updated_at).localeCompare(timeKey(a.updated_at)) ||
      a.id.localeCompare(b.id),
  );
  const page = items.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];
  return {
    items: page,
    next:
      items.length > PAGE_SIZE
        ? { id: last.id, updated_at: last.updated_at }
        : null,
  };
}

export async function loadTurf(id: string, signal?: AbortSignal) {
  let query = client().from("turfs").select(`*,${profile}`).eq("id", id);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      "Sonen finnes ikke lenger. Den kan ha blitt trukket tilbake av eieren.",
    );
  return data as unknown as GrowingTurf;
}

export async function loadTurfReceipt(
  userId: string,
  workoutId: string,
  signal?: AbortSignal,
) {
  let query = client()
    .from("turf_attempts")
    .select("result")
    .eq("actor_id", userId)
    .eq("local_id", workoutId);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? (data.result as TurfResult) : null;
}

export async function submitTurf(
  workout: Workout,
  userId: string,
  turf: GrowingTurf | null,
  extend: boolean,
  name: string,
  signal?: AbortSignal,
): Promise<{ result: TurfResult; existing: boolean }> {
  if (
    workout.ownerId !== userId ||
    workout.source !== "gps" ||
    workout.sport !== "Løping"
  )
    throw new Error("Velg din egen GPS-løpetur.");
  // Recover committed results after a lost response, even if the workout is now old.
  const receipt = await loadTurfReceipt(userId, workout.id, signal);
  if (signal?.aborted) throw new Error("VYRO_REQUEST_CANCELLED");
  if (receipt) return { result: receipt, existing: true };
  if (!turf && (!name.trim() || name.trim().length > 80))
    throw new Error("Gi sonen et navn på mellom 1 og 80 tegn.");
  const { samples } = turfPreview(workout, turf, extend);
  let query = client().rpc("submit_turf_run", {
    p_local_id: workout.id,
    p_name: name.trim(),
    p_source: workout.source,
    p_sport: workout.sport,
    p_samples: samples.map(({ latitude, longitude, accuracy, timestamp }) => ({
      latitude,
      longitude,
      accuracy,
      timestamp,
    })),
    p_turf_id: turf?.id ?? null,
    p_revision: turf?.revision ?? null,
    p_extend: extend,
  });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.turf_id || typeof data.won !== "boolean")
    throw new Error(
      "Vi fikk ingen bekreftelse. Prøv igjen; samme økt lager ikke en ekstra sone.",
    );
  return {
    result: data as TurfResult,
    existing: !!turf && data.turf_id !== turf.id,
  };
}

export async function withdrawTurf(id: string, userId: string) {
  const { data, error } = await client()
    .from("turfs")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id");
  if (error) throw error;
  if (!data.length)
    throw new Error("Sonen har endret eier. Oppdater for å se gjeldende sone.");
}

export function turfError(error: unknown) {
  const message = (error as { message?: string })?.message ?? "";
  if (message.includes("TURF_CHANGED"))
    return "Sonen er endret. Åpne sonen på nytt for å se den nye løypa før du sender forsøket.";
  if (message.includes("TURF_NOT_FOUND"))
    return "Sonen er trukket tilbake. Velg en annen sone.";
  if (message.includes("TURF_ALREADY_OWNER")) return "Du eier allerede sonen.";
  if (message.includes("TURF_NOT_FASTER"))
    return "Slå tiden på den opprinnelige sonen før du utvider den.";
  if (message.includes("TURF_EXTENSION_SHORT"))
    return "Utvidelsen må være minst 100 meter.";
  if (message.includes("TURF_GPS_GAP"))
    return "GPS-sporet har avbrudd eller for høy fart. Velg en annen løpetur med sammenhengende GPS-opptak.";
  if (message.includes("TURF_DISTANCE"))
    return "Det må være minst 200 meter sammenhengende løype igjen etter at start og slutt er skjermet. Velg en lengre tur (maks 100 km synlig løype).";
  if (message.includes("TURF_WRONG_ROUTE"))
    return "Økten følger ikke hele den gjeldende sonen i riktig retning. Velg turen du løp langs denne sonen.";
  if (message.includes("TURF_"))
    return "Opptaket kunne ikke godkjennes. Velg en GPS-løpetur fra de siste 7 dagene med presis posisjon og uten avbrudd.";
  if (
    error instanceof Error &&
    !(error as { code?: string }).code &&
    !/fetch|network|VYRO_REQUEST|abort/i.test(message)
  )
    return message;
  return socialError(error);
}
