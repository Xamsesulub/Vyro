import {
  ownerColor,
  routeRibbon,
  zoneShapes,
} from "../src/features/turf/zoneGeometry";
import { metersBetween } from "../src/features/tracking/gps";
import type { ClubTurf } from "../src/features/turf/clubApi";

const route = [
  { latitude: 59.92, longitude: 10.73 },
  { latitude: 59.921, longitude: 10.73 },
  { latitude: 59.921, longitude: 10.732 },
];
test("zone ribbon follows the course without extending across an unrun bounding box", () => {
  const polygon = routeRibbon(route);
  expect(polygon).toHaveLength(6);
  for (const point of polygon)
    expect(Math.min(...route.map((p) => metersBetween(point, p)))).toBeLessThan(
      31,
    );
});
test("duplicate points, turns and tiny routes produce finite bounded map shapes", () => {
  expect(routeRibbon([])).toEqual([]);
  expect(routeRibbon([route[0], route[0]])).toEqual([]);
  for (const p of routeRibbon([route[0], route[1], route[1], route[0]])) {
    expect(Number.isFinite(p.latitude)).toBe(true);
    expect(Number.isFinite(p.longitude)).toBe(true);
  }
});
test("owner color is stable across pages, sorting, ownership and club switches", () => {
  expect(ownerColor("mina")).toBe(ownerColor("mina"));
  const t: ClubTurf = {
    id: "zone",
    club_id: "club",
    owner_id: "mina",
    name: "Parken",
    seconds: 100,
    distance_m: 300,
    revision: 1,
    updated_at: "",
    route,
  };
  const shape = zoneShapes([t])[0];
  expect(shape.anchor).toEqual(route[1]);
  expect(shape.color).toBe(ownerColor(t.owner_id));
  expect(zoneShapes([{ ...t, route: [] }])).toEqual([]);
  expect(zoneShapes([{ ...t, owner_id: "jonas" }])[0].color).toBe(
    ownerColor("jonas"),
  );
});
