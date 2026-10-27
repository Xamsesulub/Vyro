export type Sport = "Løping" | "Gange" | "Sykling" | "Fottur" | "Fotball";
export const sports: Sport[] = [
  "Løping",
  "Gange",
  "Sykling",
  "Fottur",
  "Fotball",
];
export type Workout = {
  id: string;
  title: string;
  sport: Sport;
  distance: number;
  seconds: number;
  maxSpeedKmh?: number;
  date: string;
  notes: string;
  source: "example" | "simulation" | "gps";
  route?: { latitude: number; longitude: number; breakBefore?: boolean }[];
  visibility: "private";
  ownerId?: string;
  turfId?: string;
  turfTrace?: import("../turf/rules").Sample[];
  splits?: import("../tracking/splits").KilometerSplit[];
};
export function duration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}
export function pace(distance: number, seconds: number) {
  return distance > 0 && seconds > 0 ? duration(seconds / distance) : "—";
}
export function km(value: number) {
  return value.toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
export function total(workouts: Workout[]) {
  return workouts.reduce(
    (sum, w) => ({
      distance: sum.distance + w.distance,
      seconds: sum.seconds + w.seconds,
    }),
    { distance: 0, seconds: 0 },
  );
}
export function weekWorkouts(workouts: Workout[], now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return workouts.filter(
    (w) => new Date(w.date) >= start && new Date(w.date) <= now,
  );
}
