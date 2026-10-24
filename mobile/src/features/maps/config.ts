import type { StyleSpecification } from "mapbox-gl-v3";
export const mapboxToken = (
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""
).trim();
export const hasMapbox = mapboxToken.startsWith("pk.");
// Mapbox is used only by the web preview. iOS uses Apple MapKit.
export const mapStyle: StyleSpecification = {
  version: 8 as const,
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  imports: [
    {
      id: "basemap",
      url: "mapbox://styles/mapbox/standard",
      config: {
        lightPreset: "day",
        show3dObjects: false,
        showPointOfInterestLabels: true,
        showPedestrianRoads: true,
        showRoadLabels: true,
        theme: "default",
      },
    },
  ],
  sources: {
    terrainContours: {
      type: "vector",
      url: "mapbox://mapbox.mapbox-terrain-v2",
    },
  },
  layers: [
    {
      id: "terrain-contours",
      type: "line",
      source: "terrainContours",
      "source-layer": "contour",
      slot: "middle",
      minzoom: 12,
      paint: {
        "line-color": "#8C8466",
        "line-width": 0.7,
        "line-opacity": 0.35,
      },
    },
  ],
};
export type MapPoint = {
  latitude: number;
  longitude: number;
  breakBefore?: boolean;
};
export type MapRoute = {
  id: string;
  name: string;
  owner: string;
  points: MapPoint[];
  color: string;
};

export type MapKind = "standard" | "satellite" | "hybrid";
export function createMapStyle(
  kind: MapKind = "standard",
  poi = true,
  contours = true,
  threeD = false,
): StyleSpecification {
  const imagery = kind !== "standard";
  const labels = kind !== "satellite";
  return {
    version: 8,
    glyphs: mapStyle.glyphs,
    // Use the dedicated photographic basemap. Missing imagery must not leave
    // a normal Standard map visible while Hybrid is selected.
    imports: [
      {
        id: "basemap",
        url: imagery
          ? "mapbox://styles/mapbox/standard-satellite"
          : "mapbox://styles/mapbox/standard",
        config: {
          lightPreset: "day",
          ...(imagery
            ? { showRoadsAndTransit: labels, showAdminBoundaries: labels }
            : { show3dObjects: threeD }),
          showPedestrianRoads: labels,
          showPointOfInterestLabels: labels && poi,
          showRoadLabels: labels,
          showPlaceLabels: labels && poi,
          showTransitLabels: labels && poi,
        },
      },
    ],
    sources: {
      ...(contours ? mapStyle.sources : {}),
      ...(threeD
        ? {
            terrainDem: {
              type: "raster-dem" as const,
              url: "mapbox://mapbox.mapbox-terrain-dem-v1",
              tileSize: 512,
              maxzoom: 14,
            },
          }
        : {}),
    },
    layers: contours ? mapStyle.layers : [],
    ...(threeD ? { terrain: { source: "terrainDem", exaggeration: 1 } } : {}),
  };
}
