import { Sport, Workout, weekWorkouts } from "./model";

export type WeeklyGoal = {
  kind: "distance" | "minutes" | "sessions";
  target: number;
  sport: Sport | "Alle";
};
export const defaultGoal: WeeklyGoal = {
  kind: "distance",
  target: 20,
  sport: "Løping",
};
export const goalUnit = (goal: WeeklyGoal) =>
  ({ distance: "km", minutes: "minutter", sessions: "økter" })[goal.kind];
export function ownTraining(workouts: Workout[], owner?: string) {
  return owner
    ? workouts.filter((w) => w.source === "gps" && w.ownerId === owner)
    : [];
}
export function goalProgress(
  workouts: Workout[],
  goal: WeeklyGoal,
  owner?: string,
  now = new Date(),
) {
  const week = weekWorkouts(ownTraining(workouts, owner), now).filter(
    (w) => goal.sport === "Alle" || w.sport === goal.sport,
  );
  const value =
    goal.kind === "sessions"
      ? week.length
      : week.reduce(
          (n, w) => n + (goal.kind === "minutes" ? w.seconds / 60 : w.distance),
          0,
        );
  return {
    value,
    remaining: Math.max(0, goal.target - value),
    fraction: Math.min(1, Math.max(0, value / Math.max(1, goal.target))),
  };
}
export type HistoryFilter = {
  search: string;
  sport: Sport | "Alle";
  period: "all" | "week" | "month";
  source: "gps" | "simulation" | "example";
};
export function filterHistory(
  workouts: Workout[],
  filter: HistoryFilter,
  owner?: string,
  now = new Date(),
) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (filter.period === "week")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (filter.period === "month") start.setDate(1);
  const query = filter.search.trim().toLocaleLowerCase("nb-NO");
  return workouts
    .filter(
      (w) =>
        w.source === filter.source &&
        (w.source !== "gps" || (!!owner && w.ownerId === owner)) &&
        (filter.sport === "Alle" || w.sport === filter.sport) &&
        (!query || w.title.toLocaleLowerCase("nb-NO").includes(query)) &&
        (filter.period === "all" ||
          (new Date(w.date) >= start && new Date(w.date) <= now)),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function milestones(workouts: Workout[], owner?: string) {
  const real = ownTraining(workouts, owner);
  const longest = real.reduce<Workout | null>(
    (best, w) => (!best || w.distance > best.distance ? w : best),
    null,
  );
  const weeks = new Map<string, number>();
  for (const w of real) {
    const monday = new Date(w.date);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const key = String(monday.getTime());
    weeks.set(key, (weeks.get(key) ?? 0) + 1);
  }
  return { longest, bestWeek: Math.max(0, ...weeks.values()) };
}
