import type { StyleSpecification } from "mapbox-gl-v3";
export const mapboxToken = (
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""
).trim();
export const hasMapbox = mapboxToken.startsWith("pk.");
// Shared light, flat Standard style for the native SDK and GL JS.
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
  return {
    version: 8,
    glyphs: mapStyle.glyphs,
    // Pure satellite is a raster basemap. Hybrid puts the same photographs above
    // Standard's land/water polygons, with roads and labels above in its bottom slot.
    ...(kind !== "satellite"
      ? {
          imports: [
            {
              id: "basemap",
              url: "mapbox://styles/mapbox/standard",
              config: {
                lightPreset: "day",
                show3dObjects: threeD,
                showPedestrianRoads: true,
                showPointOfInterestLabels: poi,
                showRoadLabels: true,
                showPlaceLabels: poi,
              },
            },
          ],
        }
      : {}),
    sources: {
      ...(imagery
        ? {
            satelliteImagery: {
              type: "raster" as const,
              url: "mapbox://mapbox.satellite",
              tileSize: 256,
            },
          }
        : {}),
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
    layers: [
      ...(imagery
        ? [
            {
              id: "satellite-imagery",
              type: "raster" as const,
              source: "satelliteImagery",
              ...(kind === "hybrid" ? { slot: "bottom" } : {}),
              paint: { "raster-opacity": 1 },
            },
          ]
        : []),
      ...(contours
        ? mapStyle.layers.map((layer) => ({
            ...layer,
            slot: kind === "satellite" ? undefined : layer.slot,
          }))
        : []),
    ],
    ...(threeD ? { terrain: { source: "terrainDem", exaggeration: 1 } } : {}),
  };
}
