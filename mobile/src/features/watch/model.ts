import { sports, type Sport, type Workout } from "../activities/model";
import { footballMaxSpeed } from "../football/speed";
import {
  MAX_ACCURACY_M,
  MAX_SPEED_MS,
  metersBetween,
  type RoutePoint,
} from "../tracking/gps";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const watchReceipt = (owner: string, id: string) => `${owner}:${id}`;

/** The paired app is still an input boundary. Never trust supplied totals or ownership. */
export function watchWorkout(
  value: unknown,
  owner: string,
  now = Date.now(),
): Workout {
  const invalid = () => {
    throw new Error(
      "En klokkeøkt kunne ikke leses. Kopien på klokken er beholdt.",
    );
  };
  if (!value || typeof value !== "object") return invalid();
  const w = value as Record<string, unknown>;
  if (
    w.version !== 1 ||
    w.source !== undefined ||
    typeof w.id !== "string" ||
    !uuid.test(w.id) ||
    w.ownerId !== owner ||
    !uuid.test(owner) ||
    !sports.includes(w.sport as Sport) ||
    typeof w.startedAt !== "number" ||
    !Number.isFinite(w.startedAt) ||
    typeof w.endedAt !== "number" ||
    !Number.isFinite(w.endedAt) ||
    w.startedAt < Date.UTC(2020, 0, 1) ||
    w.endedAt > now + 300_000 ||
    w.endedAt <= w.startedAt ||
    w.endedAt - w.startedAt > 32 * 86_400_000 ||
    typeof w.activeSeconds !== "number" ||
    !Number.isFinite(w.activeSeconds) ||
    w.activeSeconds < 1 ||
    w.activeSeconds > 2592000 ||
    w.activeSeconds > (w.endedAt - w.startedAt) / 1000 + 1 ||
    !Array.isArray(w.points) ||
    w.points.length < 2 ||
    w.points.length > 20000
  )
    return invalid();
  let previous:
    { latitude: number; longitude: number; timestamp: number } | undefined;
  let meters = 0;
  const route: RoutePoint[] = [];
  for (const raw of w.points) {
    if (!raw || typeof raw !== "object") return invalid();
    const { latitude, longitude, timestamp, accuracy, breakBefore } = raw;
    if (
      ![latitude, longitude, timestamp, accuracy].every(
        (n) => typeof n === "number" && Number.isFinite(n),
      ) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      accuracy < 0 ||
      accuracy > MAX_ACCURACY_M ||
      timestamp < w.startedAt ||
      timestamp > w.endedAt ||
      (breakBefore !== undefined && typeof breakBefore !== "boolean") ||
      (previous && timestamp <= previous.timestamp)
    )
      return invalid();
    const point = { latitude, longitude };
    // Long GPS gaps must never turn into straight-line distance.
    const gap = !!previous && timestamp - previous.timestamp > 30000;
    if (previous && !breakBefore && !gap) {
      const step = metersBetween(previous, point);
      if (
        step / ((timestamp - previous.timestamp) / 1000) >
        MAX_SPEED_MS + 0.01
      )
        return invalid();
      meters += step;
    }
    route.push({
      ...point,
      ...((breakBefore || gap) && previous ? { breakBefore: true } : {}),
    });
    previous = { ...point, timestamp };
  }
  if (meters <= 0 || meters / w.activeSeconds > MAX_SPEED_MS + 0.01)
    return invalid();
  return {
    id: `watch-${w.id.toLowerCase()}`,
    ownerId: owner,
    title: `${w.sport} · Apple Watch`,
    sport: w.sport as Sport,
    date: new Date(w.startedAt).toISOString(),
    seconds: w.activeSeconds,
    distance: meters / 1000,
    route,
    notes: "",
    source: "gps",
    visibility: "private",
    ...(w.sport === "Fotball"
      ? { maxSpeedKmh: footballMaxSpeed(w.points) }
      : {}),
    // No competition trace, automatic social post, credentials or HealthKit data.
  };
}
