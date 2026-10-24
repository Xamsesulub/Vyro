import { workoutStorage } from "../lib/workoutStorage";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bufferedStorage } from "../lib/bufferedStorage";
import { Sport, Workout } from "../features/activities/model";
import { useSocialStore } from "./useSocialStore";
import { useAuthStore } from "./useAuthStore";
import { addFix, GpsFix, storedRoute } from "../features/tracking/gps";
import { withSplits } from "../features/tracking/splits";
import type { WeeklyGoal } from "../features/activities/training";
import { appendTurfFix } from "../features/turf/trace";
import {
  initialRecording,
  Recording,
  RecordingMode,
  RecordingChallenge,
  snapshot,
  transition,
} from "../features/tracking/simulator";

type State = {
  ready: boolean;
  storageError: string | null;
  onboarded: boolean;
  name: string;
  preferred: Sport[];
  goal: number;
  weeklyGoals: Record<string, WeeklyGoal>;
  backgroundRecording: boolean;
  keepWorkoutAwake: boolean;
  workoutLiveActivity: boolean;
  kilometerAlerts: "off" | "voice" | "vibration";
  backupOwners: string[];
  backupReceipts: Record<string, string>;
  hiddenBackups: string[];
  experience: string;
  theme: "dark" | "light";
  examplesVisible: boolean;
  workouts: Workout[];
  recording: Recording;
  joined: boolean;
  liked: boolean;
  setReady: (error?: string) => void;
  preferences: (
    patch: Partial<
      Pick<
        State,
        | "name"
        | "preferred"
        | "goal"
        | "weeklyGoals"
        | "backgroundRecording"
        | "keepWorkoutAwake"
        | "workoutLiveActivity"
        | "kilometerAlerts"
        | "backupOwners"
        | "experience"
        | "theme"
        | "examplesVisible"
        | "joined"
        | "liked"
        | "onboarded"
      >
    >,
  ) => void;
  sport: (sport: Sport) => void;
  mode: (mode: RecordingMode) => void;
  repeatRoute: (workout: Workout) => boolean;
  selectTurf: (challenge?: RecordingChallenge) => boolean;
  gpsFix: (fix: GpsFix) => void;
  event: (event: Parameters<typeof transition>[1]) => void;
  tick: () => void;
  save: (title: string, notes: string) => string | null;
  remove: (id: string) => void;
};
type SavedState = Pick<
  State,
  | "onboarded"
  | "name"
  | "preferred"
  | "goal"
  | "weeklyGoals"
  | "backgroundRecording"
  | "keepWorkoutAwake"
  | "workoutLiveActivity"
  | "kilometerAlerts"
  | "backupOwners"
  | "backupReceipts"
  | "hiddenBackups"
  | "experience"
  | "theme"
  | "examplesVisible"
  | "workouts"
  | "recording"
  | "joined"
  | "liked"
>;
export const appPersistence = bufferedStorage<SavedState>(workoutStorage, {
  delayMs: 5_000,
  defer: (next, previous) =>
    next.recording.status === "recording" &&
    previous.recording?.status === "recording" &&
    (Object.keys(next) as (keyof SavedState)[]).every(
      (key) => key === "recording" || Object.is(next[key], previous[key]),
    ),
  encode: ({ state, version }) =>
    JSON.stringify({
      version,
      state: {
        ...state,
        recording: {
          ...state.recording,
          lastFix: null,
          ...(state.recording.status === "recording"
            ? { status: "paused", startedAt: null }
            : {}),
        },
      },
    }),
  onError: () => {
    if (!useAppStore.getState().storageError)
      useAppStore.setState({
        storageError:
          "Lokal lagring feilet. Data er bare i minnet. Behold appen åpen.",
      });
  },
  onSuccess: () => {
    if (useAppStore.getState().storageError)
      useAppStore.setState({ storageError: null });
  },
});
export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      ready: false,
      storageError: null,
      onboarded: false,
      name: "",
      preferred: ["Løping"],
      goal: 20,
      weeklyGoals: {},
      backgroundRecording: false,
      keepWorkoutAwake: true,
      workoutLiveActivity: false,
      kilometerAlerts: "off",
      backupOwners: [],
      backupReceipts: {},
      hiddenBackups: [],
      experience: "Litt erfaring",
      theme: "light",
      examplesVisible: true,
      workouts: [],
      recording: initialRecording,
      joined: false,
      liked: false,
      setReady: (error) => set({ ready: !error, storageError: error ?? null }),
      preferences: (patch) => set(patch),
      sport: (sport) => {
        if (get().recording.status === "idle")
          set({
            recording: {
              ...get().recording,
              sport,
              challenge:
                sport === "Løping" ? get().recording.challenge : undefined,
            },
          });
      },
      mode: (mode) => {
        if (get().recording.status === "idle")
          set({
            recording: {
              ...initialRecording,
              sport: get().recording.sport,
              mode,
            },
          });
      },
      repeatRoute: (workout) => {
        if (
          get().recording.status !== "idle" ||
          workout.source !== "gps" ||
          !workout.ownerId ||
          workout.ownerId !== useAuthStore.getState().session?.user.id ||
          !workout.route ||
          workout.route.length < 2
        )
          return false;
        set({
          recording: {
            ...initialRecording,
            sport: workout.sport,
            ownerId: workout.ownerId,
            guide: {
              name: workout.title,
              route: workout.route.map((p) => ({ ...p })),
            },
          },
        });
        return true;
      },
      selectTurf: (challenge) => {
        if (get().recording.status !== "idle") return false;
        set({ recording: { ...initialRecording, challenge } });
        return true;
      },
      gpsFix: (fix) => {
        const r = get().recording;
        if (r.ownerId && r.ownerId !== useAuthStore.getState().session?.user.id)
          return;
        if (
          r.mode !== "gps" ||
          r.status !== "recording" ||
          (r.segmentStartedAt && fix.timestamp < r.segmentStartedAt)
        )
          return;
        const next = withSplits(r, addFix(r, fix), fix.timestamp);
        set({
          recording: {
            ...next,
            turfTrace: appendTurfFix(r.turfTrace ?? [], fix, !r.lastFix),
          },
        });
      },
      event: (event) => {
        const r = get().recording;
        if (
          event === "resume" &&
          r.ownerId &&
          r.ownerId !== useAuthStore.getState().session?.user.id
        )
          return;
        const next = transition(r, event);
        set({
          recording:
            event === "start" && r.status === "idle"
              ? { ...next, ownerId: useAuthStore.getState().session?.user.id }
              : next,
        });
      },
      tick: () => set({ recording: snapshot(get().recording, Date.now()) }),
      save: (title, notes) => {
        const r = get().recording;
        if (r.status !== "finishing" || r.seconds < 1) return null;
        const gps = r.mode === "gps";
        const route = storedRoute(r.route);
        if (
          gps &&
          (route.length < 2 ||
            r.distance <= 0 ||
            (r.ownerId &&
              r.ownerId !== useAuthStore.getState().session?.user.id))
        )
          return null;
        const id = `${gps ? "gps" : "sim"}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        set({
          workouts: [
            {
              id,
              title: title.trim() || `Min ${r.sport.toLowerCase()}`,
              notes: notes.trim(),
              sport: r.sport,
              distance: r.distance,
              seconds: r.seconds,
              date: new Date().toISOString(),
              source: gps ? "gps" : "simulation",
              ...(gps
                ? {
                    route,
                    ownerId: r.ownerId,
                    turfTrace: r.turfTrace,
                    turfId: r.challenge?.id,
                    splits: r.splits,
                  }
                : {}),
              visibility: "private",
            },
            ...get().workouts,
          ],
          recording: { ...initialRecording, sport: r.sport, mode: r.mode },
        });
        return id;
      },
      remove: (id) => {
        useSocialStore.getState().unshare(`post-${id}`);
        const workout = get().workouts.find((w) => w.id === id);
        set({
          workouts: get().workouts.filter((w) => w.id !== id),
          hiddenBackups: workout?.ownerId
            ? [...new Set([...get().hiddenBackups, `${workout.ownerId}:${id}`])]
            : get().hiddenBackups,
        });
      },
    }),
    {
      name: "vyro-prototype-v1",
      version: 2,
      migrate: (persisted, version) => {
        const s = persisted as State;
        return {
          ...s,
          ...(version < 1 ? { theme: "light" as const } : {}),
          recording: {
            ...initialRecording,
            ...s.recording,
            mode: s.recording?.mode ?? "simulation",
            route: s.recording?.route ?? [],
            lastFix: null,
            status:
              s.recording?.status === "recording"
                ? "paused"
                : (s.recording?.status ?? "idle"),
            startedAt: null,
          },
        };
      },
      storage: appPersistence,
      partialize: (s): SavedState => ({
        onboarded: s.onboarded,
        name: s.name,
        preferred: s.preferred,
        goal: s.goal,
        weeklyGoals: s.weeklyGoals,
        backgroundRecording: s.backgroundRecording,
        keepWorkoutAwake: s.keepWorkoutAwake,
        workoutLiveActivity: s.workoutLiveActivity,
        kilometerAlerts: s.kilometerAlerts,
        backupOwners: s.backupOwners,
        backupReceipts: s.backupReceipts,
        hiddenBackups: s.hiddenBackups,
        experience: s.experience,
        theme: s.theme,
        examplesVisible: s.examplesVisible,
        workouts: s.workouts,
        recording: s.recording,
        joined: s.joined,
        liked: s.liked,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (state)
          state.setReady(error ? "Kunne ikke lese lagrede data." : undefined);
        else
          useAppStore.setState({
            ready: false,
            storageError: "Kunne ikke lese lagrede data.",
          });
      },
    },
  ),
);
