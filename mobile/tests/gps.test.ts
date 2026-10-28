import { addFix, GpsFix, metersBetween } from "../src/features/tracking/gps";
import {
  initialRecording,
  transition,
} from "../src/features/tracking/simulator";

// About 11.1 m per 0.0001° latitude.
const fix = (
  north: number,
  t: number,
  accuracy: number | null = 5,
): GpsFix => ({
  latitude: 59.9 + north * 0.0001,
  longitude: 10.75,
  accuracy,
  timestamp: t * 1000,
});
const start = () => transition(initialRecording, "start", 0);

test("measures distance between coordinates", () => {
  expect(metersBetween(fix(0, 0), fix(1, 0))).toBeCloseTo(11.1, 0);
});
test("counts real movement and draws the route", () => {
  let r = start();
  for (let i = 0; i <= 10; i++) r = addFix(r, fix(i, i * 4));
  expect(r.distance).toBeCloseTo(0.111, 2);
  expect(r.route).toHaveLength(1);
  expect(r.route[0]).toHaveLength(11);
});
test("ignores inaccurate fixes, jitter and impossible jumps", () => {
  let r = addFix(start(), fix(0, 0));
  r = addFix(r, fix(5, 5, 80));
  r = addFix(r, { ...fix(0, 6), latitude: fix(0, 6).latitude + 0.00001 });
  r = addFix(r, fix(100, 7));
  expect(r.distance).toBe(0);
  expect(r.route[0]).toHaveLength(1);
});
test("ignores fixes while paused and never bridges a pause", () => {
  let r = addFix(start(), fix(0, 0));
  r = addFix(r, fix(2, 4));
  r = transition(r, "pause", 4000);
  const paused = addFix(r, fix(20, 60));
  expect(paused).toBe(r);
  r = transition(r, "resume", 60000);
  r = addFix(r, fix(20, 61));
  r = addFix(r, fix(22, 65));
  expect(r.route).toHaveLength(2);
  expect(r.distance).toBeCloseTo(0.0444, 3);
});
test("simulation mode ignores GPS", () => {
  const r = transition({ ...initialRecording, mode: "simulation" }, "start", 0);
  expect(addFix(r, fix(0, 0))).toBe(r);
});

test("signal gaps start a separate segment without counting the gap", () => {
  let r = addFix(start(), fix(0, 0));
  r = addFix(r, fix(2, 4));
  const distance = r.distance;
  r = addFix(r, fix(100, 60));
  expect(r.route).toHaveLength(2);
  expect(r.distance).toBe(distance);
});
test("rejects invalid coordinates and missing accuracy", () => {
  const r = start();
  expect(addFix(r, { ...fix(0, 0), latitude: NaN })).toBe(r);
  expect(addFix(r, { ...fix(0, 0), longitude: 181 })).toBe(r);
  expect(addFix(r, fix(0, 0, null))).toBe(r);
});

test("a continuous fast GPS trace keeps every measured point and its actual distance", () => {
  let r = start();
  // Synthetic bus replay: 80 km/t exceeds the old 54 km/t cutoff.
  for (let i = 0; i <= 90; i++) {
    r = addFix(r, { ...fix(i * 2, i), speed: 22.2 });
  }
  expect(r.route).toHaveLength(1);
  expect(r.route[0]).toHaveLength(91);
  expect(r.distance).toBeCloseTo(
    metersBetween(fix(0, 0), fix(180, 90)) / 1000,
    8,
  );
});

test.each([undefined, null, -1, NaN, Infinity, 0, 3, 60])(
  "fast coordinate jumps remain rejected with absent or inconsistent native speed %s",
  (speed) => {
    const r = addFix(start(), { ...fix(0, 0), speed: 3 });
    expect(addFix(r, { ...fix(2, 1), speed })).toBe(r);
    // A rejected spike does not poison the next valid running fix.
    const next = addFix(r, { ...fix(1, 4), speed: 2.8 });
    expect(next.route[0]).toHaveLength(2);
    expect(next.distance).toBeCloseTo(0.0111, 4);
  },
);

test("native speed cannot add distance while stationary, accept bad accuracy, or bridge signal loss", () => {
  const first = { ...fix(0, 0), speed: 22.2 };
  const r = addFix(start(), first);
  expect(addFix(r, { ...first, timestamp: 1000 })).toBe(r);
  expect(addFix(r, { ...fix(2, 1, 80), speed: 22.2 })).toBe(r);
  expect(addFix(r, { ...fix(100, 1), speed: 1112 })).toBe(r);
  expect(addFix(r, { ...fix(2, 0), speed: 22.2 })).toBe(r);
  const afterGap = addFix(r, { ...fix(80, 40), speed: 22.2 });
  expect(afterGap.route).toHaveLength(2);
  expect(afterGap.distance).toBe(0);
});

test("accelerating from a stop and returning to running never gets stuck on an old anchor", () => {
  let r = addFix(start(), { ...fix(0, 0), speed: 0 });
  r = addFix(r, { ...fix(2, 1), speed: 22.2 });
  r = addFix(r, { ...fix(4, 2), speed: 22.2 });
  r = addFix(r, { ...fix(5, 6), speed: 2.8 });
  expect(r.route[0]).toHaveLength(4);
  expect(r.distance).toBeCloseTo(0.0556, 4);
});
