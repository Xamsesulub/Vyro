import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Sport, Workout } from "../features/activities/model";
import {
  initialRecording,
  Recording,
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
      event: (event) => set({ recording: transition(get().recording, event) }),
      tick: () => set({ recording: snapshot(get().recording, Date.now()) }),
      save: (title, notes) => {
        const r = get().recording;
        if (r.status !== "finishing" || r.seconds < 1) return null;
        const id = `sim-${Date.now()}`;
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
              source: "simulation",
              visibility: "private",
            },
            ...get().workouts,
          ],
          recording: { ...initialRecording, sport: r.sport },
        });
        return id;
      },
      remove: (id) =>
        set({ workouts: get().workouts.filter((w) => w.id !== id) }),
    }),
    {
      name: "vyro-prototype-v1",
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
        // A restarted simulator resumes paused; it never invents time while closed.
        const recording =
          state.recording.status === "recording"
            ? { ...state.recording, status: "paused" as const, startedAt: null }
            : state.recording;
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
