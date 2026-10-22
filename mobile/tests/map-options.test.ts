import { applyMapOptions } from "../src/features/maps/options.web";
import type { Map as MapboxMap } from "mapbox-gl-v3";
test("POI and 3D changes preserve basemap and sources; optional data loads only when requested", () => {
  const sources = new Set<string>(),
    layers = new Set<string>(),
    config = new Map();
  let terrain: unknown = null;
  const map = {
    getConfigProperty: (_: string, k: string) => config.get(k),
    setConfigProperty: (_: string, k: string, v: unknown) => config.set(k, v),
    getSource: (k: string) => sources.has(k),
    addSource: jest.fn((k: string) => sources.add(k)),
    getLayer: (k: string) => layers.has(k),
    addLayer: jest.fn((v: { id: string }) => layers.add(v.id)),
    setLayoutProperty: jest.fn(),
    getTerrain: () => terrain,
    setTerrain: jest.fn((v: unknown) => {
      terrain = v;
    }),
    setStyle: jest.fn(),
  };
  const options = {
    mapKind: "standard" as const,
    poi: true,
    contours: false,
    threeD: false,
  };
  applyMapOptions(map as unknown as MapboxMap, options);
  expect(map.addSource).not.toHaveBeenCalled();
  applyMapOptions(map as unknown as MapboxMap, {
    ...options,
    threeD: true,
    contours: true,
  });
  applyMapOptions(map as unknown as MapboxMap, {
    ...options,
    poi: false,
    threeD: true,
    contours: true,
  });
  expect(map.addSource).toHaveBeenCalledTimes(2);
  expect(map.addLayer).toHaveBeenCalledTimes(1);
  expect(map.setTerrain).toHaveBeenCalledTimes(1);
  expect(map.setStyle).not.toHaveBeenCalled();
  applyMapOptions(map as unknown as MapboxMap, options);
  expect(terrain).toBeNull();
});

test("pure satellite never applies Standard import configuration or drops imagery when switching 3D", () => {
  let terrain: unknown = null;
  const map = {
    getConfigProperty: jest.fn(),
    setConfigProperty: jest.fn(),
    getSource: jest.fn(() => true),
    getLayer: jest.fn(() => false),
    getTerrain: () => terrain,
    setTerrain: jest.fn((value: unknown) => {
      terrain = value;
    }),
    setStyle: jest.fn(),
  };
  for (const threeD of [true, false])
    applyMapOptions(map as unknown as MapboxMap, {
      mapKind: "satellite",
      poi: true,
      contours: false,
      threeD,
    });
  expect(map.getConfigProperty).not.toHaveBeenCalled();
  expect(map.setConfigProperty).not.toHaveBeenCalled();
  expect(map.setStyle).not.toHaveBeenCalled();
  expect(map.setTerrain).toHaveBeenNthCalledWith(1, {
    source: "terrainDem",
    exaggeration: 1,
  });
  expect(map.setTerrain).toHaveBeenNthCalledWith(2, null);
});
