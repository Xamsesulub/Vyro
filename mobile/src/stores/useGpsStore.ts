import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
    storage: createJSONStorage(() => ({
      getItem: (key: string) => AsyncStorage.getItem(key),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
      setItem: async (key: string, value: string) => {
        try {
          await AsyncStorage.setItem(key, value);
        } catch {
          if (!useGpsStore.getState().error)
            useGpsStore.setState({
              error: "Kunne ikke lagre GPS-utkastet på enheten.",
            });
        }
      },
    })),
    partialize: (s) => ({ draft: s.draft }),
    onRehydrateStorage: () => (_state, error) =>
      useGpsStore.setState({
        ready: true,
        error: error ? "Kunne ikke gjenopprette GPS-utkastet." : null,
      }),
  }),
);
