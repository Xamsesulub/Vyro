import type { Recording } from "./simulator";
export type Coord = { latitude: number; longitude: number };
export type Fix = Coord & { accuracy: number; timestamp: number };
export type RoutePoint = Coord & { breakBefore?: boolean };
export type GpsFix = Coord & { accuracy: number | null; timestamp: number };

// Fixes worse than this are too uncertain to draw or count.
export const MAX_ACCURACY_M = 30;
// Smaller steps are mostly jitter while standing still.
export const MIN_STEP_M = 3;
// About 54 km/t: faster jumps are signal errors for these sports.
export const MAX_SPEED_MS = 15;

const R = 6371000;
const rad = (deg: number) => (deg * Math.PI) / 180;
export function metersBetween(a: Coord, b: Coord) {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function addFix(state: Recording, fix: GpsFix): Recording {
  if (state.status !== "recording" || state.mode !== "gps") return state;
  if (
    ![fix.latitude, fix.longitude, fix.timestamp].every(Number.isFinite) ||
    Math.abs(fix.latitude) > 90 ||
    Math.abs(fix.longitude) > 180 ||
    fix.accuracy === null ||
    !Number.isFinite(fix.accuracy) ||
    fix.accuracy < 0 ||
    fix.accuracy > MAX_ACCURACY_M ||
    state.route.reduce((n, s) => n + s.length, 0) >= 20000
  )
    return state;
  const point = { latitude: fix.latitude, longitude: fix.longitude };
  const route = state.route.length ? state.route : [[]];
  const append = () => [
    ...route.slice(0, -1),
    [...route[route.length - 1], point],
  ];
  const last = state.lastFix;
  if (!last) return { ...state, route: append(), lastFix: fix };
  const seconds = (fix.timestamp - last.timestamp) / 1000;
  if (seconds <= 0) return state;
  if (seconds > 30)
    return { ...state, route: [...route, [point]], lastFix: fix };
  const meters = metersBetween(last, fix);
  // Keep lastFix on tiny steps so slow movement still adds up.
  if (meters < MIN_STEP_M || meters / seconds > MAX_SPEED_MS) return state;
  return {
    ...state,
    route: append(),
    lastFix: fix,
    distance: state.distance + meters / 1000,
  };
}

export function allPoints(route: Coord[][]) {
  return route.flat();
}
// Keep pause boundaries in the existing JSON route column and API payload.
export function storedRoute(segments: Coord[][]): RoutePoint[] {
  return segments.flatMap((segment, index) =>
    segment.map((point, i) => ({
      ...point,
      ...(index > 0 && i === 0 ? { breakBefore: true } : {}),
    })),
  );
}
export function routeSegments(points: RoutePoint[]): Coord[][] {
  const segments: Coord[][] = [];
  for (const point of points) {
    if (!segments.length || point.breakBefore) segments.push([]);
    segments[segments.length - 1].push({
      latitude: point.latitude,
      longitude: point.longitude,
    });
  }
  return segments;
}
