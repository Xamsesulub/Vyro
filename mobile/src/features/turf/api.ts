import { client, socialError } from "../social/api";
import { Workout } from "../activities/model";
import { competitionTrace } from "./trace";
import { GrowingTurf, previewGrowth } from "./growth";

export type TurfResult = {
  turf_id: string;
  won: boolean;
  extended: boolean;
  revision: number;
  seconds: number;
  target_seconds: number;
  distance_m: number;
};
export async function loadTurfs() {
  const { data, error } = await client()
    .from("turfs")
    .select("*,profiles!turfs_owner_id_fkey(display_name)")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as unknown as GrowingTurf[];
}
export async function submitTurf(
  workout: Workout,
  userId: string,
  turf: GrowingTurf | null,
  extend: boolean,
  name: string,
) {
  if (
    workout.ownerId !== userId ||
    workout.source !== "gps" ||
    workout.sport !== "Løping"
  )
    throw new Error("Velg din egen GPS-løpetur.");
  const samples = competitionTrace(workout);
  previewGrowth(samples, turf, extend);
  const { data, error } = await client().rpc("submit_turf_run", {
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
  if (error) throw error;
  return data as TurfResult;
}
export function turfError(error: unknown) {
  const message = (error as { message?: string })?.message ?? "";
  if (message.includes("TURF_CHANGED"))
    return "Sonen har blitt overtatt eller utvidet. Oppdater og kontroller den nye løypa før du prøver igjen.";
  if (message.includes("TURF_ALREADY_OWNER")) return "Du eier allerede sonen.";
  if (message.includes("TURF_NOT_FASTER"))
    return "Tiden på den opprinnelige løypa må være bedre før du kan utvide sonen.";
  if (message.includes("TURF_EXTENSION_SHORT"))
    return "Utvidelsen må være minst 100 meter.";
  if (message.includes("TURF_"))
    return "GPS-opptaket oppfyller ikke kravene til denne sonen. Hele løypa må være sammenhengende, i riktig retning, og tatt opp de siste 7 dagene.";
  if (error instanceof Error && !(error as { code?: string }).code)
    return message;
  return socialError(error);
}
