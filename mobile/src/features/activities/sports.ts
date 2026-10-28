// Persist Norwegian names for compatibility with existing workouts and profiles.
// Timer sports never request GPS or invent distance from elapsed time.
export const sportCatalog = {
  Løping: { group: "Til fots", gps: true, metric: "pace", icon: "run" },
  Terrengløping: {
    group: "Til fots",
    gps: true,
    metric: "pace",
    icon: "mountain",
  },
  Gange: { group: "Til fots", gps: true, metric: "pace", icon: "run" },
  Fottur: { group: "Til fots", gps: true, metric: "pace", icon: "mountain" },
  Sykling: { group: "På sykkel", gps: true, metric: "speed", icon: "bike" },
  Terrengsykling: {
    group: "På sykkel",
    gps: true,
    metric: "speed",
    icon: "bike",
  },
  Gravelsykling: {
    group: "På sykkel",
    gps: true,
    metric: "speed",
    icon: "bike",
  },
  Elsykkel: { group: "På sykkel", gps: true, metric: "speed", icon: "bike" },
  Spinning: { group: "På sykkel", gps: false, metric: "time", icon: "bike" },
  Langrenn: {
    group: "Vinteridretter",
    gps: true,
    metric: "speed",
    icon: "mountain",
  },
  Alpint: {
    group: "Vinteridretter",
    gps: true,
    metric: "speed",
    icon: "mountain",
  },
  Snowboard: {
    group: "Vinteridretter",
    gps: true,
    metric: "speed",
    icon: "mountain",
  },
  Skøyter: {
    group: "Vinteridretter",
    gps: true,
    metric: "speed",
    icon: "track",
  },
  Truger: {
    group: "Vinteridretter",
    gps: true,
    metric: "pace",
    icon: "mountain",
  },
  Fotball: {
    group: "Lag- og racketidretter",
    gps: true,
    metric: "speed",
    icon: "ball",
  },
  Basketball: {
    group: "Lag- og racketidretter",
    gps: false,
    metric: "time",
    icon: "ball",
  },
  Volleyball: {
    group: "Lag- og racketidretter",
    gps: false,
    metric: "time",
    icon: "ball",
  },
  Cricket: {
    group: "Lag- og racketidretter",
    gps: true,
    metric: "speed",
    icon: "ball",
  },
  Tennis: {
    group: "Lag- og racketidretter",
    gps: false,
    metric: "time",
    icon: "ball",
  },
  Padel: {
    group: "Lag- og racketidretter",
    gps: false,
    metric: "time",
    icon: "ball",
  },
  Badminton: {
    group: "Lag- og racketidretter",
    gps: false,
    metric: "time",
    icon: "ball",
  },
  Svømming: { group: "På vannet", gps: false, metric: "time", icon: "waves" },
  Kajakk: { group: "På vannet", gps: true, metric: "speed", icon: "waves" },
  Roing: { group: "På vannet", gps: true, metric: "speed", icon: "waves" },
  Padling: { group: "På vannet", gps: true, metric: "speed", icon: "waves" },
  Rulleskøyter: {
    group: "Andre idretter",
    gps: true,
    metric: "speed",
    icon: "track",
  },
  Rulleski: {
    group: "Andre idretter",
    gps: true,
    metric: "speed",
    icon: "track",
  },
  Skateboarding: {
    group: "Andre idretter",
    gps: true,
    metric: "speed",
    icon: "track",
  },
  Klatring: {
    group: "Andre idretter",
    gps: false,
    metric: "time",
    icon: "mountain",
  },
  Styrketrening: {
    group: "Trening og velvære",
    gps: false,
    metric: "time",
    icon: "strength",
  },
  HIIT: {
    group: "Trening og velvære",
    gps: false,
    metric: "time",
    icon: "strength",
  },
  Elliptisk: {
    group: "Trening og velvære",
    gps: false,
    metric: "time",
    icon: "record",
  },
  Trappemaskin: {
    group: "Trening og velvære",
    gps: false,
    metric: "time",
    icon: "chart",
  },
  Yoga: {
    group: "Trening og velvære",
    gps: false,
    metric: "time",
    icon: "heart",
  },
  Pilates: {
    group: "Trening og velvære",
    gps: false,
    metric: "time",
    icon: "heart",
  },
  Dans: {
    group: "Trening og velvære",
    gps: false,
    metric: "time",
    icon: "heart",
  },
} as const;
export type Sport = keyof typeof sportCatalog;
export const sports = Object.keys(sportCatalog) as Sport[];
export const isSport = (value: unknown): value is Sport =>
  typeof value === "string" && Object.hasOwn(sportCatalog, value);
export const sportInfo = (sport: Sport) =>
  sportCatalog[sport] ?? sportCatalog.Løping;
export const workoutTypes = [
  "Vanlig økt",
  "Rolig økt",
  "Intervall",
  "Langtur",
  "Konkurranse",
  "Teknikk",
  "Kamp",
  "Trening",
] as const;
export type WorkoutType = (typeof workoutTypes)[number];
export type WorkoutDetails = { workoutType?: WorkoutType; effort?: number };
export function validWorkoutDetails(value: WorkoutDetails) {
  return (
    (value.workoutType === undefined ||
      workoutTypes.includes(value.workoutType)) &&
    (value.effort === undefined ||
      (Number.isInteger(value.effort) &&
        value.effort >= 1 &&
        value.effort <= 10))
  );
}
export function sportSections(query: string, favorites: Sport[] = []) {
  const normalized = query.trim().toLocaleLowerCase("nb-NO");
  const selected = sports.filter((sport) =>
    sport.toLocaleLowerCase("nb-NO").includes(normalized),
  );
  const groups = [...new Set(sports.map((s) => sportInfo(s).group))];
  return [
    {
      title: "Dine idretter",
      data: selected.filter((s) => favorites.includes(s)),
    },
    ...groups.map((title) => ({
      title,
      data: selected.filter(
        (s) => sportInfo(s).group === title && !favorites.includes(s),
      ),
    })),
  ].filter((s) => s.data.length);
}
