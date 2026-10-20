import { workoutStorage } from "../lib/workoutStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Sport, Workout } from "../features/activities/model";
import { useSocialStore } from "./useSocialStore";
import { useAuthStore } from "./useAuthStore";
import { addFix, GpsFix, storedRoute } from "../features/tracking/gps";
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
  selectTurf: (challenge?: RecordingChallenge) => boolean;
  gpsFix: (fix: GpsFix) => void;
  event: (event: Parameters<typeof transition>[1]) => void;
  tick: () => void;
  save: (title: string, notes: string) => string | null;
  remove: (id: string) => void;
};
export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      ready: false,
      storageError: null,
      onboarded: false,
      name: "",
      preferred: ["Løping"],
      goal: 20,
      experience: "Litt erfaring",
      theme: "light",
      examplesVisible: true,
      workouts: [],
      recording: initialRecording,
      joined: false,
      liked: false,
      setReady: (error) => set({ ready: true, storageError: error ?? null }),
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
      selectTurf: (challenge) => {
        if (get().recording.status !== "idle") return false;
        set({ recording: { ...initialRecording, challenge } });
        return true;
      },
      gpsFix: (fix) => {
        const r = get().recording;
        if (r.ownerId && r.ownerId !== useAuthStore.getState().session?.user.id)
          return;
        if (r.mode !== "gps" || r.status !== "recording") return;
        set({
          recording: {
            ...addFix(r, fix),
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
        const id = `${gps ? "gps" : "sim"}-${Date.now()}`;
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
        set({ workouts: get().workouts.filter((w) => w.id !== id) });
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
      storage: createJSONStorage(() => ({
        getItem: (key: string) => workoutStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          try {
            await workoutStorage.setItem(key, value);
          } catch {
            // A persisted setState also writes to storage; guard against recursion
            // when the device stays out of storage space.
            if (!useAppStore.getState().storageError) {
              useAppStore.setState({
                storageError:
                  "Lokal lagring feilet. Data er bare i minnet. Behold appen åpen.",
              });
            }
          }
        },
        removeItem: (key: string) => workoutStorage.removeItem(key),
      })),
      partialize: ({ ready, storageError, ...state }) => {
        // Retain private route data for recovery; resume starts a new segment.
        const recording = {
          ...state.recording,
          lastFix: null,
          ...(state.recording.status === "recording"
            ? { status: "paused" as const, startedAt: null }
            : {}),
        };
        return { ...state, recording };
      },
      onRehydrateStorage: () => (state, error) => {
        if (state)
          state.setReady(error ? "Kunne ikke lese lagrede data." : undefined);
        else
          useAppStore.setState({
            ready: true,
            storageError: "Kunne ikke lese lagrede data.",
          });
      },
    },
  ),
);
