import type { Recording } from "./simulator";
export type Coord = { latitude: number; longitude: number };
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
  if (fix.accuracy !== null && fix.accuracy > MAX_ACCURACY_M) return state;
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
