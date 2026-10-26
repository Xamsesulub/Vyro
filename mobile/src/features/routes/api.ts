import { client } from "../social/api";
import type { Workout } from "../activities/model";
import { contributionPreview } from "./contribution";
import { useAuthStore } from "../../stores/useAuthStore";
import {
  isRouteSummary,
  isSuggestedRoute,
  type RouteSearch,
  type RouteSummary,
  type SuggestedRoute,
} from "./model";
export type SavedCursor = { created_at: string; route_id: string };
export type SavedPage = { routes: RouteSummary[]; next: SavedCursor | null };
const fields =
  "id,name,sport,distance_m,ascent_m,source,attribution,created_at,place,contributor_id";
function owner(userId: string, signal?: AbortSignal) {
  if (signal?.aborted || useAuthStore.getState().session?.user.id !== userId)
    throw new Error("AUTH_REQUIRED");
}
export async function searchRoutes(
  userId: string,
  query: RouteSearch,
  signal: AbortSignal,
): Promise<SuggestedRoute[]> {
  owner(userId, signal);
  const { data, error } = await client()
    .rpc("search_community_routes", {
      p_latitude: Math.round(query.latitude * 500) / 500,
      p_longitude: Math.round(query.longitude * 500) / 500,
      p_sport: query.sport,
      p_length: query.length,
    })
    .abortSignal(signal);
  owner(userId, signal);
  if (error) throw error;
  if (
    !Array.isArray(data) ||
    data.length > 20 ||
    !data.every((r) => isSuggestedRoute(r) && r.source === "community")
  )
    throw new Error("SERVICE_UNAVAILABLE");
  return data;
}
export async function contributeRoute(
  userId: string,
  workout: Workout,
  name: string,
  place: string,
  consent: boolean,
  signal: AbortSignal,
) {
  owner(userId, signal);
  if (!consent) throw new Error("ROUTE_CONSENT_REQUIRED");
  const preview = contributionPreview(workout, userId);
  if (!preview || !name.trim() || !place.trim())
    throw new Error("ROUTE_INVALID");
  const { data, error } = await client()
    .rpc("contribute_route", {
      p_local_id: workout.id,
      p_name: name.trim(),
      p_place: place.trim(),
      p_sport: workout.sport,
      p_route: preview.route,
      p_source: workout.source,
      p_consent: true,
    })
    .abortSignal(signal);
  owner(userId, signal);
  if (error) throw error;
  if (typeof data !== "string" || !/^[a-f0-9]{64}$/.test(data))
    throw new Error("SERVICE_UNAVAILABLE");
  return data;
}
export async function withdrawRoute(
  userId: string,
  id: string,
  signal: AbortSignal,
) {
  owner(userId, signal);
  const { error } = await client()
    .rpc("withdraw_route", { p_route_id: id })
    .abortSignal(signal);
  owner(userId, signal);
  if (error) throw error;
}
export async function ownContributions(
  userId: string,
  signal: AbortSignal,
): Promise<RouteSummary[]> {
  owner(userId, signal);
  const { data, error } = await client()
    .from("route_suggestions")
    .select(fields)
    .eq("contributor_id", userId)
    .eq("source", "community")
    .order("created_at", { ascending: false })
    .limit(100)
    .abortSignal(signal);
  owner(userId, signal);
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isRouteSummary))
    throw new Error("SERVICE_UNAVAILABLE");
  return data;
}

export async function getRoute(
  id: string,
  signal?: AbortSignal,
): Promise<SuggestedRoute> {
  let query = client().from("route_suggestions").select("*").eq("id", id);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.single();
  if (error) throw error;
  if (!isSuggestedRoute(data)) throw new Error("SERVICE_UNAVAILABLE");
  return data;
}
export async function loadSavedRoutes(
  userId: string,
  cursor: SavedCursor | null,
  signal: AbortSignal,
): Promise<SavedPage> {
  let query = client()
    .from("saved_route_suggestions")
    .select(`created_at,route_id,name,route_suggestions(${fields})`)
    .eq("owner_id", userId);
  if (cursor)
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},route_id.gt.${cursor.route_id})`,
    );
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("route_id", { ascending: true })
    .limit(21)
    .abortSignal(signal);
  if (error) throw error;
  const rows = data as unknown as {
    created_at: string;
    route_id: string;
    route_suggestions: RouteSummary;
    name: string;
  }[];
  if (
    !rows.every((r) => isRouteSummary({ ...r.route_suggestions, name: r.name }))
  )
    throw new Error("SERVICE_UNAVAILABLE");
  return {
    routes: rows
      .slice(0, 20)
      .map((r) => ({ ...r.route_suggestions, name: r.name })),
    next:
      rows.length > 20
        ? { created_at: rows[19].created_at, route_id: rows[19].route_id }
        : null,
  };
}
export async function routeIsSaved(
  userId: string,
  id: string,
  signal: AbortSignal,
) {
  const { data, error } = await client()
    .from("saved_route_suggestions")
    .select("route_id,name")
    .eq("owner_id", userId)
    .eq("route_id", id)
    .abortSignal(signal)
    .maybeSingle();
  if (error) throw error;
  return data as { route_id: string; name: string } | null;
}
export async function saveRoute(
  userId: string,
  id: string,
  signal: AbortSignal,
  name?: string,
) {
  owner(userId, signal);
  const { error } = await client()
    .rpc("save_route_suggestion", {
      p_route_id: id,
      p_name: name?.trim() || null,
    })
    .abortSignal(signal);
  if (error) throw error;
}
export async function unsaveRoute(
  userId: string,
  id: string,
  signal: AbortSignal,
) {
  owner(userId, signal);
  const { error } = await client()
    .from("saved_route_suggestions")
    .delete()
    .eq("owner_id", userId)
    .eq("route_id", id)
    .abortSignal(signal);
  if (error) throw error;
}
