import type { MapPoint } from "../maps/config";
import type { ClubTurf } from "./clubApi";

const colors = [
  "#83CF37",
  "#A388E8",
  "#F0907B",
  "#55BDB1",
  "#78A7E0",
  "#DDA84C",
];
export function ownerColor(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length];
}
export type ZoneShape = {
  turf: ClubTurf;
  color: string;
  anchor: MapPoint;
  area: MapPoint[];
};
// A narrow ribbon around the shared course, not a convex hull claiming unrun
// streets. Local tangent offsets are capped at corners to avoid spikes.
export function routeRibbon(route: MapPoint[], widthMeters = 30): MapPoint[] {
  const points = route.filter(
    (p, i) =>
      !i ||
      p.latitude !== route[i - 1].latitude ||
      p.longitude !== route[i - 1].longitude,
  );
  if (points.length < 2) return [];
  const origin = points[0];
  const xScale =
    111320 * Math.max(0.01, Math.cos((origin.latitude * Math.PI) / 180));
  const xy = points.map((p) => ({
    x: (p.longitude - origin.longitude) * xScale,
    y: (p.latitude - origin.latitude) * 111320,
  }));
  const side = (sign: number) =>
    xy.map((p, i) => {
      const a = xy[Math.max(0, i - 1)],
        b = xy[Math.min(xy.length - 1, i + 1)];
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return {
        latitude:
          origin.latitude +
          (p.y + ((sign * (b.x - a.x)) / length) * widthMeters) / 111320,
        longitude:
          origin.longitude +
          (p.x - ((sign * (b.y - a.y)) / length) * widthMeters) / xScale,
      };
    });
  return [...side(1), ...side(-1).reverse()];
}
export function zoneShapes(turfs: ClubTurf[]): ZoneShape[] {
  return turfs
    .filter((t) => t.route.length > 1)
    .map((turf) => ({
      turf,
      color: ownerColor(turf.owner_id),
      anchor: turf.route[Math.floor(turf.route.length / 2)],
      area: routeRibbon(turf.route),
    }))
    .filter((shape) => shape.area.length >= 4);
}
