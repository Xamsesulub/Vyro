import { workoutStorage } from "../lib/workoutStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ActivityPost, demoPosts, people } from "../features/social/demo";
import { Workout } from "../features/activities/model";
import { isSport } from "../features/activities/sports";
type Comment = { id: string; postId: string; text: string; authorId: string };
export function shareable(w: Workout) {
  if (!isSport(w.sport)) return false;
  if (w.source === "timer")
    return (
      Number.isFinite(w.seconds) &&
      w.seconds >= 1 &&
      w.distance === 0 &&
      Array.isArray(w.route) &&
      w.route.length === 0
    );
  return (
    w.source === "gps" &&
    Number.isFinite(w.distance) &&
    w.distance > 0 &&
    Number.isFinite(w.seconds) &&
    w.seconds > 0 &&
    !!w.route &&
    w.route.length >= 2 &&
    w.route.every(
      (p) =>
        Number.isFinite(p.latitude) &&
        Math.abs(p.latitude) <= 90 &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.longitude) <= 180,
    )
  );
}
type State = {
  following: string[];
  likes: string[];
  reposts: string[];
  comments: Comment[];
  posts: ActivityPost[];
  error: string | null;
  follow: (id: string) => void;
  like: (id: string) => void;
  repost: (id: string) => void;
  comment: (id: string, text: string) => boolean;
  removeComment: (id: string) => void;
  share: (w: Workout) => boolean;
  unshare: (id: string) => void;
};
const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
export const useSocialStore = create<State>()(
  persist(
    (set, get) => ({
      following: ["demo-alex"],
      likes: [],
      reposts: [],
      comments: [],
      posts: [],
      error: null,
      follow: (id) => {
        if (people.some((p) => p.id === id))
          set({ following: toggle(get().following, id) });
      },
      like: (id) => {
        if ([...demoPosts, ...get().posts].some((p) => p.id === id))
          set({ likes: toggle(get().likes, id) });
      },
      repost: (id) => {
        if ([...demoPosts, ...get().posts].some((p) => p.id === id))
          set({ reposts: toggle(get().reposts, id) });
      },
      comment: (postId, text) => {
        const value = text.trim();
        if (
          !value ||
          value.length > 500 ||
          ![...demoPosts, ...get().posts].some((p) => p.id === postId)
        )
          return false;
        set({
          comments: [
            ...get().comments,
            {
              id: `comment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              postId,
              text: value,
              authorId: "me",
            },
          ],
        });
        return true;
      },
      removeComment: (id) =>
        set({
          comments: get().comments.filter(
            (c) => c.id !== id || c.authorId !== "me",
          ),
        }),
      share: (w) => {
        if (!shareable(w)) return false;
        if (get().posts.some((p) => p.workout.id === w.id)) return true;
        set({
          posts: [
            {
              id: `post-${w.id}`,
              authorId: "me",
              workout: { ...w, route: w.route?.map((p) => ({ ...p })) },
              createdAt: new Date().toISOString(),
            },
            ...get().posts,
          ],
        });
        return true;
      },
      unshare: (id) => {
        if (!get().posts.some((p) => p.id === id && p.authorId === "me"))
          return;
        set({
          posts: get().posts.filter((p) => p.id !== id),
          comments: get().comments.filter((c) => c.postId !== id),
          likes: get().likes.filter((x) => x !== id),
          reposts: get().reposts.filter((x) => x !== id),
        });
      },
    }),
    {
      name: "vyro-social-preview-v1",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => workoutStorage.getItem(key),
        removeItem: (key: string) => workoutStorage.removeItem(key),
        setItem: async (key: string, value: string) => {
          try {
            await workoutStorage.setItem(key, value);
          } catch {
            if (!useSocialStore.getState().error)
              useSocialStore.setState({
                error: "Kunne ikke lagre lokale sosiale valg.",
              });
          }
        },
      })),
      partialize: ({ error, ...s }) => s,
    },
  ),
);
