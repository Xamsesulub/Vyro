import * as Location from "expo-location";
import { create } from "zustand";
import type { GpsFix } from "../features/tracking/gps";
import { requestForegroundPermission } from "../features/tracking/foregroundPermission";

let permissionRevision = 0;

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
    const revision = permissionRevision;
    try {
      const res = await Location.getForegroundPermissionsAsync();
      if (revision !== permissionRevision) return get().permission;
      const permission = res.granted
        ? "granted"
        : res.canAskAgain
          ? "unknown"
          : "denied";
      set({ permission, canAskAgain: res.canAskAgain });
      return permission;
    } catch {
      if (revision === permissionRevision)
        set({ error: "Posisjon er ikke tilgjengelig på denne enheten." });
      return get().permission;
    }
  },
  request: async () => {
    const revision = ++permissionRevision;
    set({ error: null });
    try {
      const res = await requestForegroundPermission();
      if (revision !== permissionRevision) return false;
      set({
        permission: res.granted ? "granted" : "denied",
        canAskAgain: res.canAskAgain,
        error: res.granted
          ? null
          : "Tillat posisjon i nettleseren eller telefoninnstillingene, og prøv igjen.",
      });
      return res.granted;
    } catch (error) {
      if (revision === permissionRevision)
        set({
          error:
            error instanceof Error
              ? error.message
              : "Posisjon er ikke tilgjengelig på denne enheten.",
        });
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
