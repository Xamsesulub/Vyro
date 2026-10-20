import { supabase } from "../../lib/supabase";
import { Workout, Sport } from "../activities/model";
import { shareable } from "../../stores/useSocialStore";
import { sharedRoute, hasVisibleSegment } from "./routePrivacy";
export type Profile = { id: string; username: string; display_name: string };
export type Post = {
  audience?: "followers" | "everyone";
  id: string;
  author_id: string;
  title: string;
  sport: Sport;
  distance_km: number;
  seconds: number;
  recorded_at: string;
  created_at: string;
  route: { latitude: number; longitude: number; breakBefore?: boolean }[];
  profiles: Profile;
};
export type Comment = {
  id: string;
  author_id: string;
  body: string;
  profiles: Profile;
};
export function client() {
  if (!supabase) throw new Error("Supabase er ikke konfigurert.");
  return supabase;
}
export function socialError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "42P01" || code === "PGRST205" || code === "PGRST202")
    return "Databasen er ikke klargjort ennå. Prøv igjen etter at databaseoppsettet er fullført.";
  if (code === "23505") return "Dette er allerede lagret.";
  if (code === "P0001")
    return "For mange forsøk på kort tid. Vent litt og prøv igjen.";
  if (code === "42501" || code === "PGRST301")
    return "Du har ikke tilgang. Logg inn igjen og prøv på nytt.";
  return "Kunne ikke hente eller lagre data. Kontroller nettforbindelsen og prøv igjen.";
}
export async function publish(
  workout: Workout,
  userId: string,
  audience: "followers" | "everyone" = "followers",
) {
  if (!shareable(workout) || workout.ownerId !== userId)
    throw new Error("Only your own GPS workouts can be shared.");
  const route = sharedRoute(workout.route);
  if (!hasVisibleSegment(route))
    throw new Error(
      "Ruten er for kort til å deles med skjermet start og slutt.",
    );
  const { data, error } = await client().rpc("publish_workout", {
    p_local_id: workout.id,
    p_title: workout.title,
    p_sport: workout.sport,
    p_distance_km: workout.distance,
    p_seconds: Math.round(workout.seconds),
    p_recorded_at: workout.date,
    p_source: workout.source,
    p_route: route,
    p_audience: audience,
  });
  if (error) throw error;
  return data as string;
}
