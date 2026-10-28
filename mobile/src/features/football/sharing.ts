import type { Workout } from "../activities/model";
import { sharedRoute, WORKOUT_SHARING_RADIUS_METERS } from "../social/routePrivacy";

// Callers must obtain fresh, explicit consent for the chosen football workout.
// Never retain this flag as an account-wide setting. Only coordinates leave
// the device: no timestamps, GPS accuracy, notes or private competition trace.
export function publicationRoute(
  workout: Workout | undefined,
  wholeFootballRoute = false,
) {
  if (!workout || workout.source !== "gps") return [];
  if (!wholeFootballRoute || workout.sport !== "Fotball")
    return sharedRoute(workout.route, WORKOUT_SHARING_RADIUS_METERS);
  const route = workout.route ?? [];
  if (
    route.length > 20000 ||
    route.some(
      (p) =>
        !p ||
        !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 90 ||
        Math.abs(p.longitude) > 180,
    )
  )
    return [];
  return route.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    ...(p.breakBefore ? { breakBefore: true } : {}),
  }));
}
