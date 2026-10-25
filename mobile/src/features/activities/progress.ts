import type { Sport, Workout } from "./model";
import { ownTraining } from "./training";

// Calendar arithmetic (not 24-hour millisecond division) preserves local weeks
// around daylight-saving transitions and year boundaries.
export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function monday(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}
export function trainingProgress(
  workouts: Workout[],
  owner: string | undefined,
  sport: Sport | "Alle" = "Alle",
  now = new Date(),
) {
  const real = ownTraining(workouts, owner).filter(
    (w) =>
      (sport === "Alle" || w.sport === sport) &&
      Number.isFinite(new Date(w.date).getTime()) &&
      new Date(w.date) <= now,
  );
  const start = monday(now);
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() - (11 - i) * 7);
    return { date, key: localDay(date), distance: 0, seconds: 0, count: 0 };
  });
  const byWeek = new Map(weeks.map((w) => [w.key, w]));
  const activeWeeks = new Set<string>();
  const activeDays = new Set<string>();
  for (const w of real) {
    const date = new Date(w.date);
    const key = localDay(monday(date));
    activeWeeks.add(key);
    activeDays.add(localDay(date));
    const week = byWeek.get(key);
    if (week) {
      week.distance += w.distance;
      week.seconds += w.seconds;
      week.count++;
    }
  }
  let streak = 0;
  const cursor = new Date(start);
  // An unfinished current week does not break a streak earned last week.
  if (!activeWeeks.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (activeWeeks.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const month = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), index + 1);
    return {
      day: index + 1,
      active: activeDays.has(localDay(date)),
      today: localDay(date) === localDay(now),
      future: date > now,
    };
  });
  return {
    weeks,
    current: weeks[11],
    streak,
    month,
    monthOffset:
      (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7,
  };
}
