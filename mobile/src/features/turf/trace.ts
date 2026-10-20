import { Workout } from "../activities/model";
import { GpsFix, metersBetween } from "../tracking/gps";
import { sharedRoute } from "../social/routePrivacy";
import { Sample } from "./rules";

// Separate evidence for competitions; never changes Henos' distance calculation.
export function appendTurfFix(trace: Sample[], fix: GpsFix, resumed: boolean) {
  if (
    trace.length >= 20000 ||
    ![fix.latitude, fix.longitude, fix.timestamp, fix.accuracy].every(
      (v) => typeof v === "number" && Number.isFinite(v),
    ) ||
    Math.abs(fix.latitude) > 90 ||
    Math.abs(fix.longitude) > 180 ||
    fix.accuracy === null ||
    fix.accuracy < 0 ||
    fix.accuracy > 30
  )
    return trace;
  const last = trace[trace.length - 1];
  if (last && fix.timestamp <= last.timestamp) return trace;
  return [
    ...trace,
    {
      latitude: fix.latitude,
      longitude: fix.longitude,
      timestamp: fix.timestamp,
      accuracy: fix.accuracy,
      ...(resumed && last ? { breakBefore: true } : {}),
    },
  ];
}

// Never upload the private first/last 500 m. Preserve timestamps only for the
// selected continuous interior; privacy gaps must never be bridged.
export function competitionTrace(workout: Workout): Sample[] {
  if (workout.source !== "gps" || workout.sport !== "Løping") return [];
  const raw = workout.turfTrace ?? [];
  // A stationary pause can remain continuous; elapsed timestamps still include it.
  const continuous = raw.map((p, i) => ({
    ...p,
    breakBefore: !!p.breakBefore && i > 0 && metersBetween(raw[i - 1], p) > 10,
  }));
  const visible = sharedRoute(continuous);
  const segments: Sample[][] = [];
  let cursor = 0;
  for (const point of visible) {
    while (
      cursor < raw.length &&
      (raw[cursor].latitude !== point.latitude ||
        raw[cursor].longitude !== point.longitude)
    )
      cursor++;
    if (cursor === raw.length) return [];
    if (!segments.length || point.breakBefore) segments.push([]);
    segments[segments.length - 1].push({
      ...raw[cursor++],
      breakBefore: false,
    });
  }
  // No silent selection of one of several disconnected pieces.
  return segments.length === 1 ? segments[0] : [];
}

export function traceDistance(
  points: { latitude: number; longitude: number }[],
) {
  return points
    .slice(1)
    .reduce((sum, p, i) => sum + metersBetween(points[i], p), 0);
}
