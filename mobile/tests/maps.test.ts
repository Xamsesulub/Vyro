import { mapFeatures, mapBounds } from "../src/features/maps/geometry";
import { createMapStyle } from "../src/features/maps/config";
test("live position is a separate blue point, never a recorded route", () => {
  const f = mapFeatures([], [], { latitude: 59.9, longitude: 10.7 });
  expect(f.features).toHaveLength(1);
  expect(f.features[0].geometry).toEqual({
    type: "Point",
    coordinates: [10.7, 59.9],
  });
  expect(f.features[0].properties).toMatchObject({
    kind: "position",
    color: "#1689F8",
  });
  expect(mapFeatures([], [], null).features).toEqual([]);
});
test("map layers distinguish satellite labels and enable terrain only in 3D", () => {
  expect(
    createMapStyle("satellite", true, false).imports?.[0].config
      ?.showRoadLabels,
  ).toBe(false);
  expect(createMapStyle("hybrid").imports?.[0].config?.showRoadLabels).toBe(
    true,
  );
  expect(createMapStyle("standard", true, false).layers).toEqual([]);
  expect(createMapStyle().terrain).toBeUndefined();
  expect(createMapStyle("standard", true, true, true).terrain).toEqual({
    source: "terrainDem",
    exaggeration: 1,
  });
});
test("Mapbox preserves GPS pause boundaries and longitude/latitude order", () => {
  const route = [
    [
      { latitude: 59.9, longitude: 10.7 },
      { latitude: 59.91, longitude: 10.71 },
    ],
    [
      { latitude: 60, longitude: 11 },
      { latitude: 60.01, longitude: 11.01 },
    ],
  ];
  const f = mapFeatures(route, [], null);
  const lines = f.features.filter((v) => v.geometry.type === "LineString");
  expect(
    lines.map((v) => (v.geometry as { coordinates: number[][] }).coordinates),
  ).toEqual([
    [
      [10.7, 59.9],
      [10.71, 59.91],
    ],
    [
      [11, 60],
      [11.01, 60.01],
    ],
  ]);
  expect(mapBounds(route, [])).toEqual({
    sw: [10.7, 59.9],
    ne: [11.01, 60.01],
  });
});
test("shared turf routes retain break markers and owner labels", () => {
  const f = mapFeatures(
    [],
    [
      {
        id: "a",
        name: "Tur",
        owner: "Alex",
        color: "#356618",
        points: [
          { latitude: 59, longitude: 10 },
          { latitude: 59.01, longitude: 10.01 },
          { latitude: 60, longitude: 11, breakBefore: true },
          { latitude: 60.01, longitude: 11.01 },
        ],
      },
    ],
  );
  expect(
    f.features.filter((v) => v.geometry.type === "LineString"),
  ).toHaveLength(2);
  expect(
    f.features.find((v) => v.geometry.type === "Point")?.properties?.label,
  ).toBe("Alex");
  expect(mapFeatures([], []).features).toEqual([]);
});
