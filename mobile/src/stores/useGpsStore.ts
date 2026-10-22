import { create } from "zustand";
import { persist } from "zustand/middleware";
import { workoutStorage } from "../lib/workoutStorage";
import { bufferedStorage } from "../lib/bufferedStorage";
import { Fix } from "../features/tracking/gps";
type Draft = {
  id: string;
  ownerId: string;
  date: string;
  points: Fix[];
  distance: number;
  seconds: number;
};
type State = {
  draft: Draft | null;
  ready: boolean;
  error: string | null;
};
export const useGpsStore = create<State>()(
  persist((): State => ({ draft: null, ready: false, error: null }), {
    name: "vyro-gps-draft-v1",
    storage: bufferedStorage<{ draft: Draft | null }>(workoutStorage, {
      delayMs: 0,
      defer: () => false,
      onError: () =>
        useGpsStore.setState({
          error: "Kunne ikke lagre GPS-utkastet på enheten.",
        }),
      onSuccess: () => {},
    }),
    partialize: (s) => ({ draft: s.draft }),
    onRehydrateStorage: () => (_state, error) =>
      useGpsStore.setState({
        ready: true,
        error: error ? "Kunne ikke gjenopprette GPS-utkastet." : null,
      }),
  }),
);
