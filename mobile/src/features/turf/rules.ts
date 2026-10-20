import { MapPoint } from "../maps/config";
export type Sample = MapPoint & {
  timestamp: number;
  accuracy: number;
  breakBefore?: boolean;
};
export type Turf = {
  id: string;
  name: string;
  checkpoints: MapPoint[];
  sport: "Løping";
};
export function meters(a: MapPoint, b: MapPoint) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad,
    dLon = (b.longitude - a.longitude) * rad;
  return (
    6371000 *
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(dLat / 2) ** 2 +
            Math.cos(a.latitude * rad) *
              Math.cos(b.latitude * rad) *
              Math.sin(dLon / 2) ** 2,
        ),
      ),
    )
  );
}
// A candidate calculation, NOT server verification. Never trust client-submitted results.
export function evaluateTurf(
  turf: Turf,
  samples: Sample[],
  source: string,
  sport: string,
  incumbentSeconds: number | null,
) {
  const reject = (reason: string) => ({
    eligible: false,
    takesOver: false,
    seconds: null,
    reason,
  });
  if (source !== "gps" || sport !== turf.sport)
    return reject("Krever GPS-opptak av samme aktivitetstype.");
  if (turf.checkpoints.length < 2 || samples.length < 2)
    return reject("Mangler løype eller GPS-punkter.");
  if (
    samples.some(
      (p) =>
        !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 90 ||
        Math.abs(p.longitude) > 180 ||
        !Number.isFinite(p.timestamp) ||
        !Number.isFinite(p.accuracy) ||
        p.accuracy < 0 ||
        p.accuracy > 30,
    )
  )
    return reject("Ugyldig eller upresist GPS-signal.");
  let checkpoint = 0,
    start = -1,
    end = -1;
  for (let i = 0; i < samples.length; i++) {
    if (meters(samples[i], turf.checkpoints[checkpoint]) <= 25) {
      if (checkpoint === 0) start = i;
      checkpoint++;
      if (checkpoint === turf.checkpoints.length) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return reject("Hele løypen må passeres i riktig retning.");
  let distance = 0;
  for (let i = start + 1; i <= end; i++) {
    const dt = (samples[i].timestamp - samples[i - 1].timestamp) / 1000;
    const d = meters(samples[i - 1], samples[i]);
    if (dt <= 0 || dt > 15 || d / dt > 14)
      return reject("GPS-opptaket har hull eller urealistisk fart.");
    distance += d;
  }
  const routeDistance = turf.checkpoints
    .slice(1)
    .reduce((sum, p, i) => sum + meters(turf.checkpoints[i], p), 0);
  if (distance < routeDistance * 0.95)
    return reject("Opptaket dekker ikke hele distansen.");
  const seconds = (samples[end].timestamp - samples[start].timestamp) / 1000;
  if (seconds <= 0) return reject("Ugyldig tid.");
  return {
    eligible: true,
    takesOver: incumbentSeconds === null || seconds < incumbentSeconds,
    seconds,
    reason:
      "Kandidat klar for serverkontroll. Lik tid beholder nåværende eier.",
  };
}
