export type Fix = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
};
export function distanceMeters(a: Fix, b: Fix) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function validFix(p: Fix, now = Date.now()) {
  return (
    Object.values(p).every(Number.isFinite) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180 &&
    p.accuracy >= 0 &&
    p.accuracy <= 30 &&
    Math.abs(now - p.timestamp) <= 15000
  );
}
export function segmentDistance(previous: Fix, next: Fix) {
  const dt = (next.timestamp - previous.timestamp) / 1000;
  const distance = distanceMeters(previous, next);
  if (dt <= 0 || dt > 30 || distance / dt > 14) return null;
  return distance >= 3 ? distance : 0;
}
