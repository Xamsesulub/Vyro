import { duration, km, pace } from "../activities/model";
import { snapshot, type Recording } from "./simulator";
import type { Coord } from "./gps";
import { sportInfo } from "../activities/sports";

export type WorkoutActivityProps = {
  timerOnly?: boolean;
  paceLabel?: string;
  sport: string;
  paused: boolean;
  seconds: string;
  timerStart: number;
  distance: string;
  pace: string;
  mapUri: string | null;
  mapTime: string;
};

export type WorkoutPresentation = {
  ready: boolean;
  enabled: boolean;
  foreground: boolean;
  userId?: string;
  recording: Recording;
};

export function canPresentWorkout(s: WorkoutPresentation) {
  return (
    s.ready &&
    s.enabled &&
    s.recording.mode !== "simulation" &&
    !!s.userId &&
    s.recording.ownerId === s.userId &&
    (s.recording.status === "recording" || s.recording.status === "paused")
  );
}

export function workoutActivityProps(
  r: Recording,
  now: number,
  mapUri: string | null,
  mapAt: number,
): WorkoutActivityProps {
  const current = snapshot(r, now);
  const speed = sportInfo(r.sport).metric === "speed";
  return {
    timerOnly: r.mode === "timer",
    sport: r.sport,
    paused: r.status === "paused",
    seconds: duration(current.seconds),
    timerStart: now - current.seconds * 1000,
    distance: km(current.distance),
    paceLabel: speed ? "Snitt km/t" : "Snitt /km",
    pace:
      current.distance >= 0.1
        ? speed
          ? ((current.distance * 3600) / Math.max(1, current.seconds))
              .toFixed(1)
              .replace(".", ",")
          : pace(current.distance, current.seconds)
        : "—",
    mapUri: r.mode === "timer" ? null : mapUri,
    mapTime:
      r.mode !== "timer" && mapAt
        ? new Date(mapAt).toLocaleTimeString("nb-NO", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
  };
}

// Bound snapshot work independently of the full private workout. Keep pause
// boundaries and only show the latest part of long routes near the runner.
export function snapshotRoute(route: Coord[][]): Coord[][] {
  let remaining = 240;
  const result: Coord[][] = [];
  for (let i = route.length - 1; i >= 0 && remaining > 0; i--) {
    const segment = route[i]
      .slice(-remaining)
      .filter(
        (p) =>
          Number.isFinite(p.latitude) &&
          Number.isFinite(p.longitude) &&
          Math.abs(p.latitude) <= 85 &&
          Math.abs(p.longitude) <= 180,
      );
    if (segment.length) result.unshift(segment);
    remaining -= segment.length;
  }
  return result;
}
