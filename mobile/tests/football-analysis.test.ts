import { inflateSync } from "node:zlib";
import { footballHeatmap } from "../src/features/football/heatmap";
import { rgbaPng } from "../src/features/football/png";
import { footballMaxSpeed } from "../src/features/football/speed";
import { publicationRoute } from "../src/features/football/sharing";
import { backupPayload, validBackup } from "../src/features/backup/model";
import type { Workout } from "../src/features/activities/model";

const point = (x: number, y = 0) => ({
  latitude: 59.9 + y / 111195,
  longitude: 10.7 + x / (111195 * Math.cos((59.9 * Math.PI) / 180)),
});
function raster(uri: string) {
  const bytes = Buffer.from(uri.split(",")[1], "base64");
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const blocks: Buffer[] = [];
  let width = 0;
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset),
      type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "IHDR") width = bytes.readUInt32BE(offset + 8);
    if (type === "IDAT")
      blocks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(blocks));
  expect(raw.length).toBe(width * (width * 4 + 1));
  return {
    raw,
    width,
    alpha: (x: number, y: number) => raw[y * (width * 4 + 1) + 1 + x * 4 + 3],
  };
}
const fixes = (speed = 6) =>
  Array.from({ length: 11 }, (_, i) => ({
    ...point(i * speed),
    timestamp: i * 1000,
    accuracy: 3,
  }));

test("max speed uses a sustained five-second GPS window, not average session pace", () => {
  expect(footballMaxSpeed(fixes())).toBeCloseTo(21.6, 1);
  expect(footballMaxSpeed(fixes(0))).toBe(0);
  expect(footballMaxSpeed(fixes().slice(0, 5))).toBeUndefined();
  expect(footballMaxSpeed([])).toBeUndefined();
});
test("bad accuracy, pauses, missing fixes and jumps cannot create a speed peak", () => {
  const short = fixes().slice(0, 6);
  expect(
    footballMaxSpeed(short.map((p, i) => ({ ...p, breakBefore: i === 3 }))),
  ).toBeUndefined();
  expect(
    footballMaxSpeed(
      short.map((p, i) => ({ ...p, accuracy: i === 3 ? 25 : 3 })),
    ),
  ).toBeUndefined();
  expect(
    footballMaxSpeed(
      short.map((p, i) => ({
        ...p,
        timestamp: p.timestamp + (i >= 3 ? 60000 : 0),
      })),
    ),
  ).toBeUndefined();
  const spike = fixes();
  spike[5] = { ...spike[5], ...point(1000) };
  expect(footballMaxSpeed(spike)).toBeUndefined();
  expect(
    footballMaxSpeed(
      short.map((p, i) => ({ ...p, timestamp: i === 3 ? 1000 : p.timestamp })),
    ),
  ).toBeUndefined();
  expect(
    footballMaxSpeed(short.map((p, i) => ({ ...p, ...point(i % 2 ? 3 : 0) }))),
  ).toBe(0);
});
test("PNG encoder survives multiple DEFLATE blocks and preserves transparent pixels", () => {
  const pixels = new Uint8Array(192 * 192 * 4);
  pixels[0] = 255;
  pixels[3] = 200;
  const decoded = raster(rgbaPng(192, pixels));
  expect(decoded.alpha(0, 0)).toBe(200);
  expect(decoded.alpha(191, 191)).toBe(0);
  expect(() => rgbaPng(500, pixels)).toThrow();
});
test("heatmap bounds enclose route and transparent margins; empty and invalid recordings stay empty", () => {
  const route = [point(0), point(40), point(40, 80), point(0, 80), point(0)];
  const result = footballHeatmap(route)!;
  const [[north, east], [south, west]] = result.bounds;
  expect(
    route.every(
      (p) =>
        p.latitude < north &&
        p.latitude > south &&
        p.longitude > west &&
        p.longitude < east,
    ),
  ).toBe(true);
  const decoded = raster(result.uri);
  expect(decoded.alpha(0, 0)).toBe(0);
  expect([...decoded.raw].some((v) => v > 0)).toBe(true);
  for (const invalid of [
    [],
    [point(0)],
    [point(0), point(0)],
    [point(0), { latitude: NaN, longitude: 10 }],
  ])
    expect(footballHeatmap(invalid)).toBeNull();
});
test("pause/privacy gaps do not paint a line through the middle", () => {
  const result = footballHeatmap([
    point(0, 0),
    point(0, 10),
    { ...point(80, 90), breakBefore: true },
    point(80, 100),
  ])!;
  const image = raster(result.uri);
  expect(image.alpha(96, 96)).toBe(0);
});
test("denser GPS sampling does not make the same route hotter", () => {
  const sparse = raster(footballHeatmap([point(0), point(100)])!.uri);
  const dense = raster(
    footballHeatmap(Array.from({ length: 101 }, (_, i) => point(i)))!.uri,
  );
  let error = 0;
  for (let i = 0; i < sparse.raw.length; i++)
    error += Math.abs(sparse.raw[i] - dense.raw[i]);
  expect(error / sparse.raw.length).toBeLessThan(1.5);
});
const w: Workout = {
  id: "gps-ball",
  ownerId: "a",
  title: "Fotball",
  sport: "Fotball",
  source: "gps",
  visibility: "private",
  notes: "privat",
  distance: 1,
  seconds: 300,
  date: "2026-10-27T10:00:00Z",
  route: [point(0), point(50), point(50, 80)],
  maxSpeedKmh: 21.6,
};
test("a pitch stays hidden by default and whole-route consent cannot expose other sports or simulations", () => {
  expect(publicationRoute(w)).toEqual([]);
  expect(publicationRoute(w, true)).toEqual(w.route);
  expect(publicationRoute({ ...w, sport: "Løping" }, true)).toEqual([]);
  expect(publicationRoute({ ...w, source: "simulation" }, true)).toEqual([]);
  expect(publicationRoute({ ...w, route: fixes() }, true)[0]).toEqual(point(0));
});
test("private backup carries only validated optional football speed, never raw accuracy/timestamps", () => {
  const result = backupPayload({ ...w, turfTrace: fixes() }, "a");
  expect(result.maxSpeedKmh).toBe(21.6);
  expect(result.turfTrace).toBeUndefined();
  expect(validBackup({ ...result, maxSpeedKmh: undefined }, "a", w.id)).toBe(
    true,
  );
  for (const value of [-1, NaN, Infinity, 100])
    expect(validBackup({ ...result, maxSpeedKmh: value }, "a", w.id)).toBe(
      false,
    );
  expect(validBackup({ ...result, sport: "Løping" }, "a", w.id)).toBe(false);
});
