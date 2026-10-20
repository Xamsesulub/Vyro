import { previewGrowth, GrowingTurf } from "../src/features/turf/growth";
import {
  appendTurfFix,
  competitionTrace,
  traceDistance,
} from "../src/features/turf/trace";
import { Workout } from "../src/features/activities/model";
const trace = (n: number, step = 5000) =>
  Array.from({ length: n }, (_, i) => ({
    latitude: 59.9 + i * 0.0002,
    longitude: 10.7,
    accuracy: 5,
    timestamp: 100000 + i * step,
  }));
const base = trace(21);
const turf: GrowingTurf = {
  id: "t",
  name: "Test",
  owner_id: "henos",
  revision: 1,
  route: base,
  distance_m: traceDistance(base),
  seconds: 125,
};
test("faster old course plus opt-in extension becomes the new full course and target", () => {
  const run = trace(31);
  const normal = previewGrowth(run, turf, false);
  expect(normal.seconds).toBe(100);
  expect(normal.route).toHaveLength(21);
  const grown = previewGrowth(run, turf, true);
  expect(grown.wins).toBe(true);
  expect(grown.originalSeconds).toBe(100);
  expect(grown.seconds).toBe(150);
  expect(grown.route).toHaveLength(31);
  expect(grown.route.slice(0, 21)).toEqual(
    base.map(({ latitude, longitude }) => ({ latitude, longitude })),
  );
  const next = {
    ...turf,
    route: grown.route,
    distance_m: grown.distance,
    seconds: grown.seconds,
    revision: 2,
  };
  expect(() => previewGrowth(base, next, false)).toThrow();
  expect(previewGrowth(run, next, false).wins).toBe(false);
  expect(previewGrowth(trace(31, 4000), next, false).wins).toBe(true);
});
test("slower attempts, tiny extensions, detours and signal gaps do not win extensions", () => {
  expect(() => previewGrowth(trace(31, 7000), turf, true)).toThrow();
  expect(() => previewGrowth(trace(23), turf, true)).toThrow();
  expect(() =>
    previewGrowth(
      trace(31).map((p, i) => (i === 10 ? { ...p, longitude: 10.71 } : p)),
      turf,
      false,
    ),
  ).toThrow();
  expect(() => previewGrowth(trace(31, 20000), turf, true)).toThrow();
});
test("privacy filtering never uploads either endpoint or bridges hidden revisits", () => {
  const raw = trace(101);
  const w: Workout = {
    id: "gps1",
    title: "Run",
    sport: "Løping",
    source: "gps",
    distance: 2.2,
    seconds: 500,
    date: "",
    notes: "",
    visibility: "private",
    turfTrace: raw,
  };
  const visible = competitionTrace(w);
  expect(visible.length).toBeGreaterThan(2);
  expect(visible[0].timestamp).toBeGreaterThan(raw[0].timestamp);
  expect(visible[visible.length - 1].timestamp).toBeLessThan(
    raw[100].timestamp,
  );
  expect(competitionTrace({ ...w, source: "simulation" })).toEqual([]);
  expect(competitionTrace({ ...w, turfTrace: undefined })).toEqual([]);
  expect(
    competitionTrace({
      ...w,
      turfTrace: [...raw, ...raw.slice().reverse(), ...raw],
    }),
  ).toEqual([]);
});
test("timestamp evidence is bounded, accurate, monotonic and stationary pauses count", () => {
  const p = base[0];
  expect(appendTurfFix([p], p, false)).toEqual([p]);
  expect(appendTurfFix([], { ...p, accuracy: null }, false)).toEqual([]);
  expect(appendTurfFix([], { ...p, accuracy: 50 }, false)).toEqual([]);
  const paused = [
    ...base.slice(0, 10),
    { ...base[9], timestamp: base[9].timestamp + 60000 },
    ...base.slice(10).map((p) => ({ ...p, timestamp: p.timestamp + 60000 })),
  ];
  expect(previewGrowth(paused, turf, false).originalSeconds).toBe(160);
});
