import { shareable, useSocialStore } from "../src/stores/useSocialStore";
import { Workout } from "../src/features/activities/model";
import { demoPosts } from "../src/features/social/demo";
const w: Workout = {
  id: "gps-test",
  title: "Test",
  date: "2026-10-20T10:00:00Z",
  sport: "Løping",
  distance: 2,
  seconds: 600,
  notes: "",
  visibility: "private",
  source: "gps",
  route: [
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.91, longitude: 10.71 },
  ],
};
beforeEach(() =>
  useSocialStore.setState({
    following: [],
    likes: [],
    reposts: [],
    posts: [],
    comments: [],
    error: null,
  }),
);
test("sharing requires GPS, distance, elapsed time and valid route; duplicate share is idempotent", () => {
  expect(shareable({ ...w, source: "simulation" })).toBe(false);
  expect(shareable({ ...w, route: [] })).toBe(false);
  expect(shareable({ ...w, distance: NaN })).toBe(false);
  useSocialStore.getState().share(w);
  useSocialStore.getState().share(w);
  expect(useSocialStore.getState().posts).toHaveLength(1);
});
test("likes and reposts toggle and keep original author; comments reject blank or orphaned content", () => {
  const s = useSocialStore.getState();
  const id = demoPosts[0].id;
  s.like(id);
  s.like(id);
  expect(useSocialStore.getState().likes).toHaveLength(0);
  s.repost(id);
  expect(useSocialStore.getState().reposts).toEqual([id]);
  expect(s.comment(id, "  ")).toBe(false);
  expect(s.comment("missing", "hei")).toBe(false);
  expect(s.comment(id, "Bra løpt")).toBe(true);
  expect(useSocialStore.getState().comments[0].text).toBe("Bra løpt");
});
test("unshare removes dependent reactions, comments and reposts", () => {
  const s = useSocialStore.getState();
  s.share(w);
  const id = `post-${w.id}`;
  s.like(id);
  s.repost(id);
  s.comment(id, "Hei");
  s.unshare(id);
  expect(useSocialStore.getState()).toMatchObject({
    posts: [],
    likes: [],
    reposts: [],
    comments: [],
  });
});
