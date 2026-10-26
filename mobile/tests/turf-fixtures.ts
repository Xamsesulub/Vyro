import type { Workout } from "../src/features/activities/model";
import type { TurfResult } from "../src/features/turf/api";
export function turfWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "gps-zone",
    title: "Langs elva",
    ownerId: "owner",
    source: "gps",
    sport: "Løping",
    distance: 2.224,
    seconds: 500,
    date: new Date().toISOString(),
    notes: "",
    visibility: "private",
    turfTrace: Array.from({ length: 101 }, (_, i) => ({
      latitude: 59.9 + i * 0.0002,
      longitude: 10.7,
      accuracy: 5,
      timestamp: Date.now() - 3600000 + i * 5000,
    })),
    ...overrides,
  };
}
export const turfResult: TurfResult = {
  turf_id: "zone-server",
  won: true,
  extended: false,
  revision: 1,
  seconds: 270,
  target_seconds: 270,
  distance_m: 1200,
};
