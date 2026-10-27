import { metersBetween, type RoutePoint } from "../tracking/gps";

type TimedPoint = RoutePoint & { timestamp: number; accuracy: number };

// Conservative 5–8 second displacement, not a noisy single GPS speed spike.
// Breaks, poor fixes and implausible jumps invalidate the whole window.
export function footballMaxSpeed(
  points: readonly TimedPoint[],
): number | undefined {
  let window: TimedPoint[] = [];
  let maximum: number | undefined;
  for (const point of points.slice(0, 20000)) {
    if (
      ![point.latitude, point.longitude, point.timestamp, point.accuracy].every(
        Number.isFinite,
      ) ||
      Math.abs(point.latitude) > 85 ||
      Math.abs(point.longitude) > 180 ||
      point.accuracy < 0 ||
      point.accuracy > 10
    ) {
      window = [];
      continue;
    }
    const last = window[window.length - 1];
    if (
      point.breakBefore ||
      (last &&
        (point.timestamp <= last.timestamp ||
          point.timestamp - last.timestamp > 3000 ||
          metersBetween(last, point) /
            ((point.timestamp - last.timestamp) / 1000) >
            15))
    ) {
      window = [];
    }
    window.push(point);
    while (window.length > 1 && point.timestamp - window[1].timestamp >= 5000)
      window.shift();
    const start = window[0];
    const elapsed = (point.timestamp - start.timestamp) / 1000;
    if (elapsed < 5 || elapsed > 8) continue;
    const distance = metersBetween(start, point);
    // Small movements inside the combined accuracy are not a sprint.
    const speed =
      distance <= Math.max(10, start.accuracy + point.accuracy)
        ? 0
        : (distance / elapsed) * 3.6;
    maximum = Math.max(maximum ?? 0, speed);
  }
  return maximum === undefined ? undefined : Math.round(maximum * 10) / 10;
}

export function validMaxSpeed(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 54
  );
}
