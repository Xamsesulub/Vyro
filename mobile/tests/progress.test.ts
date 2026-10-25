import {
  localDay,
  monday,
  trainingProgress,
} from "../src/features/activities/progress";
import type { Workout } from "../src/features/activities/model";

const now = new Date(2026, 9, 25, 12);
const workout = (date: Date, patch: Partial<Workout> = {}): Workout => ({
  id: date.toISOString(),
  title: "Tur",
  sport: "Løping",
  date: date.toISOString(),
  source: "gps",
  ownerId: "a",
  visibility: "private",
  distance: 5,
  seconds: 1800,
  notes: "",
  ...patch,
});
test("12 local calendar weeks count only the owner's completed GPS history and selected sport", () => {
  const today = workout(now);
  const data = trainingProgress(
    [
      today,
      workout(now, { sport: "Gange", distance: 2, seconds: 1200 }),
      workout(now, { ownerId: "b", distance: 999 }),
      workout(now, { source: "simulation", distance: 999 }),
      workout(now, { source: "example", distance: 999 }),
      workout(new Date(2026, 9, 26)),
      workout(now, { date: "invalid" }),
      workout(new Date(2026, 6, 1)),
    ],
    "a",
    "Alle",
    now,
  );
  expect(data.weeks).toHaveLength(12);
  expect(data.current).toMatchObject({
    key: "2026-10-19",
    count: 2,
    distance: 7,
    seconds: 3000,
  });
  expect(data.weeks.reduce((n, w) => n + w.distance, 0)).toBe(7);
  expect(trainingProgress([today], undefined, "Alle", now).current.count).toBe(
    0,
  );
  expect(trainingProgress([today], "a", "Gange", now).current.count).toBe(0);
  expect(data.month.filter((d) => d.active)).toEqual([
    { day: 25, active: true, today: true, future: false },
  ]);
  expect(data.month).toHaveLength(31);
});
test("streak allows the unfinished current week but breaks across a missed full week", () => {
  const history = [
    workout(new Date(2026, 9, 15)),
    workout(new Date(2026, 9, 8)),
  ];
  expect(trainingProgress(history, "a", "Alle", now).streak).toBe(2);
  expect(
    trainingProgress([...history, workout(now)], "a", "Alle", now).streak,
  ).toBe(3);
  expect(trainingProgress([history[1]], "a", "Alle", now).streak).toBe(0);
});
test("weeks and month grids work across a year boundary and leap February", () => {
  const january = new Date(2027, 0, 3, 10);
  expect(localDay(monday(january))).toBe("2026-12-28");
  const data = trainingProgress(
    [workout(new Date(2026, 11, 31))],
    "a",
    "Alle",
    january,
  );
  expect(data.current.count).toBe(1);
  expect(data.month.filter((d) => d.active)).toHaveLength(0);
  expect(data.monthOffset).toBe(4);
  expect(
    trainingProgress([], "a", "Alle", new Date(2028, 1, 29)).month,
  ).toHaveLength(29);
});
