import { metersBetween, RoutePoint } from "../tracking/gps";

export const WORKOUT_SHARING_RADIUS_METERS = 200;

function crossesHiddenArea(
  a: RoutePoint,
  b: RoutePoint,
  center: RoutePoint,
  radius: number,
) {
  const edge = metersBetween(a, b);
  // Never bridge implausibly sparse fixes. Short-edge approximation is conservative.
  if (edge > 5000) return true;
  if (!edge) return false;
  const left = metersBetween(a, center),
    right = metersBetween(b, center);
  const along = (left * left + edge * edge - right * right) / (2 * edge);
  if (along <= 0 || along >= edge) return false;
  return Math.sqrt(Math.max(0, left * left - along * along)) <= radius * 1.01;
}
export function sharedRoute(
  route: RoutePoint[] = [],
  radius = 500,
): RoutePoint[] {
  if (route.length < 2) return [];
  const start = route[0],
    end = route[route.length - 1];
  const result: RoutePoint[] = [];
  let gap = true;
  for (const point of route) {
    if (
      metersBetween(start, point) <= radius ||
      metersBetween(end, point) <= radius
    ) {
      gap = true;
      continue;
    }
    const previous = result[result.length - 1];
    const crosses =
      previous &&
      (crossesHiddenArea(previous, point, start, radius) ||
        crossesHiddenArea(previous, point, end, radius));
    result.push({
      latitude: point.latitude,
      longitude: point.longitude,
      ...(gap || crosses || point.breakBefore ? { breakBefore: true } : {}),
    });
    gap = false;
  }
  return result;
}
export function hasVisibleSegment(route: RoutePoint[]) {
  return route.some((point, index) => index > 0 && !point.breakBefore);
}
