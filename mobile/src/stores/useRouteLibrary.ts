import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { workoutStorage } from "../lib/workoutStorage";
import {
  isSuggestedRoute,
  type SuggestedRoute,
} from "../features/routes/model";
type Entry = { ownerId: string; route: SuggestedRoute };
// Only server-confirmed bookmarks are persisted, encrypted and scoped to owner.
// Bounded offline cache; the server holds the complete library.
export const useRouteLibrary = create<{
  entries: Entry[];
  remember: (ownerId: string, route: SuggestedRoute) => void;
  forget: (ownerId: string, id: string) => void;
}>()(
  persist(
    (set) => ({
      entries: [],
      remember: (ownerId, route) => {
        if (!isSuggestedRoute(route)) return;
        set((s) => ({
          entries: [
            { ownerId, route },
            ...s.entries.filter(
              (e) => e.ownerId !== ownerId || e.route.id !== route.id,
            ),
          ].slice(0, 20),
        }));
      },
      forget: (ownerId, id) =>
        set((s) => ({
          entries: s.entries.filter(
            (e) => e.ownerId !== ownerId || e.route.id !== id,
          ),
        })),
    }),
    {
      name: "vyro-route-library-v1",
      storage: createJSONStorage(() => ({
        // This is a disposable offline cache; cloud bookmarks remain authoritative.
        getItem: async (key) => {
          try {
            return await workoutStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: async (key, value) => {
          try {
            await workoutStorage.setItem(key, value);
          } catch {
            /* cache unavailable; keep cloud save */
          }
        },
        removeItem: async (key) => {
          try {
            await workoutStorage.removeItem(key);
          } catch {
            /* cache only */
          }
        },
      })),
      partialize: (s) => ({ entries: s.entries }),
      merge: (persisted, current) => ({
        ...current,
        entries: (Array.isArray((persisted as { entries?: unknown })?.entries)
          ? (persisted as { entries: Entry[] }).entries
          : []
        )
          .filter(
            (e) => typeof e?.ownerId === "string" && isSuggestedRoute(e.route),
          )
          .slice(0, 20),
      }),
    },
  ),
);
