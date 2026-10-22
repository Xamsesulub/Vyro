import {
  filterHistory,
  goalProgress,
  milestones,
} from "../src/features/activities/training";
import type { Workout } from "../src/features/activities/model";
import { withSplits } from "../src/features/tracking/splits";
import {
  initialRecording,
  transition,
} from "../src/features/tracking/simulator";
const now = new Date("2026-10-22T12:00:00Z");
const workout: Workout = {
  id: "gps-1",
  title: "Morgentur",
  sport: "Løping",
  date: "2026-10-21T12:00:00Z",
  distance: 5,
  seconds: 1500,
  notes: "",
  visibility: "private",
  source: "gps",
  ownerId: "a",
};
const workouts: Workout[] = [
  workout,
  { ...workout, id: "walk", sport: "Gange", distance: 2, seconds: 1200 },
  { ...workout, id: "old", date: "2026-09-21T12:00:00Z" },
  { ...workout, id: "other", ownerId: "b", distance: 999 },
  { ...workout, id: "sim", source: "simulation", distance: 999 },
  { ...workout, id: "example", source: "example", distance: 999 },
];
test("weekly goals count only this account's real workouts, selected sport and current week", () => {
  expect(
    goalProgress(
      workouts,
      { kind: "distance", target: 10, sport: "Løping" },
      "a",
      now,
    ),
  ).toEqual({ value: 5, remaining: 5, fraction: 0.5 });
  expect(
    goalProgress(
      workouts,
      { kind: "minutes", target: 30, sport: "Alle" },
      "a",
      now,
    ),
  ).toEqual({ value: 45, remaining: 0, fraction: 1 });
  expect(
    goalProgress(
      workouts,
      { kind: "sessions", target: 3, sport: "Alle" },
      "a",
      now,
    ).value,
  ).toBe(2);
  expect(
    goalProgress(
      workouts,
      { kind: "sessions", target: 3, sport: "Alle" },
      undefined,
      now,
    ).value,
  ).toBe(0);
});
test("history combines case-insensitive search, sport, source and calendar filters", () => {
  expect(
    filterHistory(
      workouts,
      { search: " MORGEN ", sport: "Løping", period: "month", source: "gps" },
      "a",
      now,
    ).map((w) => w.id),
  ).toEqual(["gps-1"]);
  expect(
    filterHistory(
      workouts,
      { search: "", sport: "Alle", period: "all", source: "gps" },
      undefined,
      now,
    ),
  ).toEqual([]);
  expect(
    filterHistory(
      workouts,
      { search: "", sport: "Alle", period: "all", source: "simulation" },
      "a",
      now,
    ).map((w) => w.id),
  ).toEqual(["sim"]);
  expect(milestones(workouts, "a")).toEqual({ longest: workout, bestWeek: 2 });
});
test("kilometer crossing is interpolated between accepted GPS points and pauses add no time", () => {
  const started = transition(initialRecording, "start", 1000);
  const before = { ...started, distance: 0.9, lastDistanceSeconds: 270 };
  const after = withSplits(
    before,
    {
      ...before,
      distance: 1.1,
      lastFix: { latitude: 0, longitude: 0, accuracy: 5, timestamp: 331000 },
    },
    331000,
  );
  expect(after.splits).toEqual([
    { kilometer: 1, seconds: 300, elapsedSeconds: 300 },
  ]);
  const paused = transition(after, "pause", 331000);
  const resumed = transition(paused, "resume", 931000);
  const next = { ...resumed, distance: 1.9, lastDistanceSeconds: 570 };
  const final = withSplits(
    next,
    {
      ...next,
      distance: 2.1,
      lastFix: { latitude: 0, longitude: 0, accuracy: 5, timestamp: 1231000 },
    },
    1231000,
  );
  expect(final.splits?.[1]).toEqual({
    kilometer: 2,
    seconds: 300,
    elapsedSeconds: 600,
  });
});
test("rejected fixes and older recordings never manufacture split times", () => {
  const started = transition(initialRecording, "start", 0);
  expect(withSplits(started, started, 500000)).toBe(started);
  const old = { ...initialRecording, distance: 1.1 };
  expect(withSplits(initialRecording, old, 500000).splits).toBeUndefined();
});
