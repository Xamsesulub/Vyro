import type { Map } from "mapbox-gl-v3";
import { createMapStyle, type MapKind } from "./config";
export type MapOptions = {
  mapKind: MapKind;
  poi: boolean;
  contours: boolean;
  threeD: boolean;
};
// Change individual layers, not the basemap. Preserve camera, routes and source cache.
export function applyMapOptions(map: Map, options: MapOptions) {
  const config = createMapStyle(
    options.mapKind,
    options.poi,
    false,
    options.threeD,
  ).imports![0].config!;
  for (const [name, value] of Object.entries(config)) {
    if (map.getConfigProperty("basemap", name) !== value)
      map.setConfigProperty("basemap", name, value);
  }
  if (options.contours && !map.getSource("terrainContours")) {
    const style = createMapStyle("standard", false, true, false);
    map.addSource("terrainContours", style.sources.terrainContours);
    map.addLayer(style.layers[0]);
  }
  if (map.getLayer("terrain-contours"))
    map.setLayoutProperty(
      "terrain-contours",
      "visibility",
      options.contours ? "visible" : "none",
    );
  if (options.threeD && !map.getSource("terrainDem"))
    map.addSource("terrainDem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
  const hasTerrain = !!map.getTerrain();
  if (options.threeD && !hasTerrain)
    map.setTerrain({ source: "terrainDem", exaggeration: 1 });
  else if (!options.threeD && hasTerrain) map.setTerrain(null);
}
