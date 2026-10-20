import type { FeatureCollection, Feature, Geometry } from "geojson";
import { routeSegments, type Coord } from "../tracking/gps";
import type { MapRoute } from "./config";
export type LiveMapProps = {
  height?: number;
  attributionBottom?: number;
  mapKind?: import("./config").MapKind;
  poi?: boolean;
  contours?: boolean;
  threeD?: boolean;
  north?: number;
  target?: Coord | null;
  explorer?: boolean;
  recenter?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  onPan?: () => void;
  route?: Coord[][];
  position?: Coord | null;
  follow?: boolean;
  overlays?: MapRoute[];
};
export const emptyRoute: Coord[][] = [];
export const emptyOverlays: MapRoute[] = [];
export function mapFeatures(
  route: Coord[][],
  overlays: MapRoute[],
  position?: Coord | null,
): FeatureCollection {
  const features: Feature<Geometry>[] = [];
  const add = (segments: Coord[][], color: string, label: string) => {
    for (const segment of segments)
      if (segment.length > 1)
        features.push({
          type: "Feature",
          properties: { color },
          geometry: {
            type: "LineString",
            coordinates: segment.map((p) => [p.longitude, p.latitude]),
          },
        });
    const start = segments.flat()[0];
    if (start)
      features.push({
        type: "Feature",
        properties: { color, label },
        geometry: {
          type: "Point",
          coordinates: [start.longitude, start.latitude],
        },
      });
  };
  add(route, "#356618", "Start");
  overlays.forEach((r) =>
    add(routeSegments(r.points), r.color, r.owner || r.name),
  );
  if (position)
    features.push({
      type: "Feature",
      properties: { color: "#1689F8", label: "", kind: "position" },
      geometry: {
        type: "Point",
        coordinates: [position.longitude, position.latitude],
      },
    });
  return { type: "FeatureCollection", features };
}
export function mapBounds(route: Coord[][], overlays: MapRoute[]) {
  const p = [...route.flat(), ...overlays.flatMap((r) => r.points)];
  if (!p.length) return null;
  return {
    ne: [
      Math.max(...p.map((v) => v.longitude)),
      Math.max(...p.map((v) => v.latitude)),
    ],
    sw: [
      Math.min(...p.map((v) => v.longitude)),
      Math.min(...p.map((v) => v.latitude)),
    ],
  };
}
