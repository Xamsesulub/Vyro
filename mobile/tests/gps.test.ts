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
