import type { Region } from "react-native-maps";
import { brand } from "../../theme/tokens";
import { routeSegments, type Coord } from "../tracking/gps";
import type { MapRoute } from "./config";

export function appleMapGeometry(route: Coord[][], overlays: MapRoute[]) {
  const lines: { id: string; coordinates: Coord[]; color: string }[] = [];
  const markers: {
    id: string;
    coordinate: Coord;
    color: string;
    title: string;
  }[] = [];
  const coordinates: Coord[] = [];
  const add = (
    id: string,
    segments: Coord[][],
    color: string,
    title: string,
  ) => {
    segments.forEach((segment, index) => {
      coordinates.push(...segment);
      if (segment.length > 1)
        lines.push({ id: `${id}-${index}`, coordinates: segment, color });
    });
    const start = segments.find((segment) => segment.length)?.[0];
    if (start) markers.push({ id, coordinate: start, color, title });
  };
  add("workout", route, brand.route, "Start");
  overlays.forEach((overlay) =>
    add(
      `overlay-${overlay.id}`,
      routeSegments(overlay.points),
      overlay.color,
      overlay.owner || overlay.name,
    ),
  );
  return { lines, markers, coordinates };
}

export function appleInitialRegion(
  coordinates: Coord[],
  focus: Coord | null,
): Region {
  if (focus) return { ...focus, latitudeDelta: 0.012, longitudeDelta: 0.012 };
  if (!coordinates.length)
    return {
      latitude: 59.9139,
      longitude: 10.7522,
      latitudeDelta: 0.09,
      longitudeDelta: 0.09,
    };
  let south = 90,
    north = -90,
    west = 180,
    east = -180;
  for (const point of coordinates) {
    south = Math.min(south, point.latitude);
    north = Math.max(north, point.latitude);
    west = Math.min(west, point.longitude);
    east = Math.max(east, point.longitude);
  }
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: Math.max(0.006, (north - south) * 1.3),
    longitudeDelta: Math.max(0.006, (east - west) * 1.3),
  };
}
