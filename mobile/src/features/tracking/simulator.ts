import { Sport } from "../activities/model";
import type { Coord, GpsFix } from "./gps";
import type { Sample } from "../turf/rules";
export type RecordingMode = "gps" | "simulation";
export type RecordingChallenge = { id: string; name: string; route: Coord[] };
export type Recording = {
  challenge?: RecordingChallenge;
  guide?: {
    name: string;
    route: import("./gps").RoutePoint[];
    attribution?: string;
  };
  segmentStartedAt?: number;
  segmentSeconds?: number;
  lastDistanceSeconds?: number;
  splitCheckpoint?: { kilometer: number; elapsedSeconds: number };
  splits?: import("./splits").KilometerSplit[];
  status: "idle" | "recording" | "paused" | "finishing";
  sport: Sport;
  mode: RecordingMode;
  seconds: number;
  startedAt: number | null;
  distance: number;
  // GPS only: one segment per active stretch, so pauses never draw or count a jump.
  route: Coord[][];
  lastFix: GpsFix | null;
  ownerId?: string;
  turfTrace?: Sample[];
};
export const initialRecording: Recording = {
  status: "idle",
  sport: "Løping",
  mode: "gps",
  seconds: 0,
  startedAt: null,
  distance: 0,
  route: [],
  lastFix: null,
};
const speeds: Record<Sport, number> = {
  Løping: 10,
  Gange: 4.8,
  Sykling: 22,
  Fottur: 3.6,
  Fotball: 6,
};
export function snapshot(state: Recording, now: number): Recording {
  if (state.status !== "recording" || state.startedAt === null) return state;
  if (now <= state.startedAt) return state;
  const elapsed = Math.max(0, (now - state.startedAt) / 1000);
  return {
    ...state,
    seconds: state.seconds + elapsed,
    // GPS distance comes from real fixes in gps.ts, never from an assumed speed.
    distance:
      state.mode === "simulation"
        ? state.distance + (elapsed * speeds[state.sport]) / 3600
        : state.distance,
    startedAt: now,
  };
}
export function transition(
  state: Recording,
  event: "start" | "pause" | "resume" | "finish" | "discard",
  now = Date.now(),
): Recording {
  if (event === "discard")
    return { ...initialRecording, sport: state.sport, mode: state.mode };
  if (event === "start" && state.status === "idle")
    return {
      ...state,
      status: "recording",
      startedAt: now,
      route: [[]],
      lastFix: null,
      turfTrace: [],
      segmentStartedAt: now,
      segmentSeconds: 0,
      lastDistanceSeconds: 0,
      splitCheckpoint: { kilometer: 0, elapsedSeconds: 0 },
      splits: [],
    };
  if (event === "pause" && state.status === "recording")
    return { ...snapshot(state, now), status: "paused", startedAt: null };
  if (event === "resume" && state.status === "paused")
    return {
      ...state,
      status: "recording",
      startedAt: now,
      route: [...state.route, []],
      lastFix: null,
      segmentStartedAt: now,
      segmentSeconds: state.seconds,
      lastDistanceSeconds: state.seconds,
    };
  if (
    event === "finish" &&
    (state.status === "recording" || state.status === "paused")
  )
    return { ...snapshot(state, now), status: "finishing", startedAt: null };
  return state;
}
// Illustration coordinates, not a navigable route or real GPS observations.
export const demoRoute = [
  { latitude: 59.922, longitude: 10.754 },
  { latitude: 59.925, longitude: 10.757 },
  { latitude: 59.928, longitude: 10.755 },
  { latitude: 59.931, longitude: 10.759 },
  { latitude: 59.934, longitude: 10.76 },
  { latitude: 59.936, longitude: 10.764 },
  { latitude: 59.939, longitude: 10.765 },
];
