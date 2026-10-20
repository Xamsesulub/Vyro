import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
export const useSavedRoutes = create<{
  ids: string[];
  toggle: (id: string) => void;
}>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set({
          ids: get().ids.includes(id)
            ? get().ids.filter((v) => v !== id)
            : [...get().ids, id],
        }),
    }),
    {
      name: "vyro-saved-route-ids",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
