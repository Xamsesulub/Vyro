import type { Workout } from "../src/features/activities/model";
export const contributionWorkout: Workout = {
  id: "private-workout",
  title: "Min private tur",
  sport: "Løping",
  distance: 4.4,
  seconds: 1800,
  date: "2026-10-26T10:00:00Z",
  notes: "private notes",
  source: "gps",
  ownerId: "owner",
  visibility: "private",
  route: Array.from({ length: 101 }, (_, i) => ({
    latitude: 59.9 + i * 0.0004,
    longitude: 10.7,
  })),
};
