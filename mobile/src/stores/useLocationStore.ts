import * as Location from "expo-location";
import { create } from "zustand";
import type { GpsFix } from "../features/tracking/gps";

export type Permission = "unknown" | "granted" | "denied";
type State = {
  permission: Permission;
  canAskAgain: boolean;
  position: GpsFix | null;
  error: string | null;
  // Screens showing a live map; the watcher only runs while someone needs it.
  viewers: number;
  check: () => Promise<Permission>;
  request: () => Promise<boolean>;
  view: () => () => void;
  setPosition: (fix: GpsFix) => void;
  setError: (error: string | null) => void;
};
// Not persisted: the position is never written to storage.
export const useLocationStore = create<State>()((set, get) => ({
  permission: "unknown",
  canAskAgain: true,
  position: null,
  error: null,
  viewers: 0,
  check: async () => {
    try {
      const res = await Location.getForegroundPermissionsAsync();
      const permission = res.granted
        ? "granted"
        : res.canAskAgain
          ? "unknown"
          : "denied";
      set({ permission, canAskAgain: res.canAskAgain });
      return permission;
    } catch {
      set({ error: "Posisjon er ikke tilgjengelig på denne enheten." });
      return get().permission;
    }
  },
  request: async () => {
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      set({
        permission: res.granted ? "granted" : "denied",
        canAskAgain: res.canAskAgain,
        error: res.granted ? null : get().error,
      });
      return res.granted;
    } catch {
      set({ error: "Posisjon er ikke tilgjengelig på denne enheten." });
      return false;
    }
  },
  view: () => {
    set({ viewers: get().viewers + 1 });
    return () => set({ viewers: Math.max(0, get().viewers - 1) });
  },
  setPosition: (position) => set({ position, error: null }),
  setError: (error) => set({ error }),
}));
