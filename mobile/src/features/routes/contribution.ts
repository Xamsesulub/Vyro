import type { Workout } from "../activities/model";
import { metersBetween, type RoutePoint } from "../tracking/gps";
import { sharedRoute } from "../social/routePrivacy";
import { routeSports, type RouteSport } from "./model";

export function canContribute(workout: Workout, owner: string) {
  return (
    !!owner &&
    workout.ownerId === owner &&
    workout.source === "gps" &&
    routeSports.includes(workout.sport as RouteSport) &&
    !!workout.route?.length
  );
}
export function contributionPreview(workout: Workout, owner: string) {
  if (!canContribute(workout, owner)) return null;
  if (
    !workout.route?.every(
      (p) =>
        Number.isFinite(p.latitude) &&
        Math.abs(p.latitude) <= 85 &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.longitude) <= 180,
    )
  )
    return null;
  // Keep only the visible geometry. Never upload the original trace or its times.
  const route = sharedRoute(workout.route, 500).map((p): RoutePoint => ({
    latitude: p.latitude,
    longitude: p.longitude,
    ...(p.breakBefore ? { breakBefore: true } : {}),
  }));
  const distance = route.reduce(
    (sum, p, i) =>
      sum + (i && !p.breakBefore ? metersBetween(route[i - 1], p) : 0),
    0,
  );
  if (
    route.length < 2 ||
    route.length > 20000 ||
    !Number.isFinite(distance) ||
    distance < 500 ||
    distance > 50000
  )
    return null;
  return { route, distance };
}
