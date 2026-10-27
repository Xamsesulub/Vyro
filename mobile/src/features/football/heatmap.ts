import { metersBetween, type RoutePoint } from "../tracking/gps";
import { rgbaPng } from "./png";

export type HeatmapOverlay = {
  uri: string;
  bounds: [[number, number], [number, number]];
};
const SIZE = 192;
const R = 6378137;
const rad = Math.PI / 180;
const project = (p: RoutePoint) => [
  R * p.longitude * rad,
  R * Math.log(Math.tan(Math.PI / 4 + (p.latitude * rad) / 2)),
];
const unproject = (x: number, y: number): [number, number] => [
  (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) / rad,
  x / R / rad,
];

// Movement density, NOT dwell time. Uniform distance sampling avoids hotspots
// caused by differences in GPS frequency. Pause/privacy gaps are never joined.
export function footballHeatmap(
  points: readonly RoutePoint[],
): HeatmapOverlay | null {
  if (
    points.length < 2 ||
    points.length > 20000 ||
    points.some(
      (p) =>
        !p ||
        !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 85 ||
        Math.abs(p.longitude) > 180,
    )
  )
    return null;
  const projected = points.map(project);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of projected) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const scale = 1 / Math.cos(points[0].latitude * rad);
  const span = Math.max(40 * scale, maxX - minX, maxY - minY) * 1.25;
  if (span > 100000 * scale) return null; // malformed/dateline route, not a pitch
  const left = (minX + maxX - span) / 2,
    bottom = (minY + maxY - span) / 2;
  const lengths = points.map((p, i) =>
    i && !p.breakBefore ? metersBetween(points[i - 1], p) : 0,
  );
  const total = lengths.reduce((sum, d) => sum + (d <= 500 ? d : 0), 0);
  if (total < 3) return null;
  const step = Math.max(2, total / 16000);
  const grid = new Float32Array(SIZE * SIZE);
  for (let i = 1; i < points.length; i++) {
    const d = lengths[i];
    if (d <= 0 || d > 500) continue;
    const count = Math.ceil(d / step);
    for (let j = 0; j < count; j++) {
      const t = (j + 0.5) / count;
      const x =
        ((projected[i - 1][0] +
          (projected[i][0] - projected[i - 1][0]) * t -
          left) /
          span) *
        (SIZE - 1);
      const y =
        ((bottom +
          span -
          projected[i - 1][1] -
          (projected[i][1] - projected[i - 1][1]) * t) /
          span) *
        (SIZE - 1);
      const ix = Math.floor(x),
        iy = Math.floor(y),
        weight = d / count;
      for (let dy = 0; dy <= 1; dy++)
        for (let dx = 0; dx <= 1; dx++) {
          if (ix + dx >= 0 && ix + dx < SIZE && iy + dy >= 0 && iy + dy < SIZE)
            grid[(iy + dy) * SIZE + ix + dx] +=
              weight * (dx ? x - ix : 1 - x + ix) * (dy ? y - iy : 1 - y + iy);
        }
    }
  }
  const sigma = Math.max(1.5, Math.min(8, ((5 * scale) / span) * SIZE)),
    radius = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) =>
    Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)),
  );
  const blur = (input: Float32Array, horizontal: boolean) => {
    const out = new Float32Array(input.length);
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        for (let k = -radius; k <= radius; k++) {
          const xx = horizontal ? x + k : x,
            yy = horizontal ? y : y + k;
          if (xx >= 0 && xx < SIZE && yy >= 0 && yy < SIZE)
            out[y * SIZE + x] += input[yy * SIZE + xx] * kernel[k + radius];
        }
      }
    return out;
  };
  const density = blur(blur(grid, true), false);
  let peak = 0;
  for (const value of density) peak = Math.max(peak, value);
  if (!peak) return null;
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < density.length; i++) {
    const t = density[i] / peak;
    if (t < 0.04) continue;
    const hot = Math.min(1, t * 2);
    pixels[i * 4] = Math.round(110 + 145 * hot);
    pixels[i * 4 + 1] = Math.round(t < 0.5 ? 235 : 235 - (t - 0.5) * 350);
    pixels[i * 4 + 2] = 35;
    pixels[i * 4 + 3] = Math.round(210 * Math.min(1, t * 4));
  }
  return {
    uri: rgbaPng(SIZE, pixels),
    bounds: [unproject(left + span, bottom + span), unproject(left, bottom)],
  };
}
