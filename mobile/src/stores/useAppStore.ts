import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Sport, Workout } from "../features/activities/model";
import {
  initialRecording,
  Recording,
  RecordingMode,
  snapshot,
  transition,
} from "../features/tracking/simulator";
import { addFix, GpsFix } from "../features/tracking/gps";

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
      theme: "dark",
      examplesVisible: true,
      workouts: [],
      recording: initialRecording,
      joined: false,
      liked: false,
      setReady: (error) => set({ ready: true, storageError: error ?? null }),
      preferences: (patch) => set(patch),
      sport: (sport) => {
        if (get().recording.status === "idle")
          set({ recording: { ...get().recording, sport } });
      },
      mode: (mode) => {
        if (get().recording.status === "idle")
          set({ recording: { ...get().recording, mode } });
      },
      gpsFix: (fix) => {
        const next = addFix(get().recording, fix);
        if (next !== get().recording) set({ recording: next });
      },
      event: (event) => set({ recording: transition(get().recording, event) }),
      tick: () => set({ recording: snapshot(get().recording, Date.now()) }),
      save: (title, notes) => {
        const r = get().recording;
        if (r.status !== "finishing" || r.seconds < 1) return null;
        const gps = r.mode === "gps";
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
              visibility: "private",
            },
            ...get().workouts,
          ],
          recording: { ...initialRecording, sport: r.sport, mode: r.mode },
        });
        return id;
      },
      remove: (id) =>
        set({ workouts: get().workouts.filter((w) => w.id !== id) }),
    }),
    {
      name: "vyro-prototype-v1",
      version: 1,
      // v0 sessions predate GPS and were all simulations.
      migrate: (persisted, version) => {
        const state = persisted as Partial<State>;
        if (version < 1 && state.recording)
          state.recording = {
            ...initialRecording,
            ...state.recording,
            mode: "simulation",
          };
        return state as State;
      },
      storage: createJSONStorage(() => ({
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          try {
            await AsyncStorage.setItem(key, value);
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
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      })),
      partialize: ({ ready, storageError, ...state }) => {
        // A restarted session resumes paused; it never invents time while closed.
        // Coordinates stay in memory only: AsyncStorage is unencrypted (docs/security.md).
        const recording = {
          ...state.recording,
          ...(state.recording.status === "recording" && {
            status: "paused" as const,
            startedAt: null,
          }),
          route: [],
          lastFix: null,
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
