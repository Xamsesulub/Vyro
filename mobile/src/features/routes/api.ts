import { client } from "../social/api";
import { timeoutFetch } from "../../lib/request";
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
  "id,name,sport,distance_m,ascent_m,source,attribution,created_at";
function owner(userId: string, signal?: AbortSignal) {
  if (signal?.aborted || useAuthStore.getState().session?.user.id !== userId)
    throw new Error("AUTH_REQUIRED");
}
export async function searchRoutes(
  userId: string,
  query: RouteSearch,
  signal: AbortSignal,
): Promise<SuggestedRoute[]> {
  const { data, error } = await client().auth.getSession();
  if (error) throw error;
  owner(userId, signal);
  if (!data.session || data.session.user.id !== userId)
    throw new Error("AUTH_REQUIRED");
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";
  const res = await timeoutFetch(fetch, 30000)(
    `${url}/functions/v1/route-suggestions`,
    {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      // No address, user-supplied route, GPS trace, speed or timestamp is uploaded.
      body: JSON.stringify({
        latitude: Math.round(query.latitude * 500) / 500,
        longitude: Math.round(query.longitude * 500) / 500,
        sport: query.sport,
        length: query.length,
      }),
    },
  );
  owner(userId, signal);
  const payload = await res.json();
  if (!res.ok)
    throw {
      code:
        res.status === 404
          ? "ROUTES_NOT_CONFIGURED"
          : (payload.code ??
            (res.status === 401 ? "AUTH_REQUIRED" : "SERVICE_UNAVAILABLE")),
    };
  if (
    !Array.isArray(payload.routes) ||
    payload.routes.length > 3 ||
    !payload.routes.every(isSuggestedRoute)
  )
    throw new Error("SERVICE_UNAVAILABLE");
  return payload.routes;
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
