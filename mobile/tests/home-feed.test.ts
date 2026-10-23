jest.mock("../src/lib/supabase", () => ({ supabase: { rpc: jest.fn() } }));
jest.mock("../src/features/social/feed", () => ({
  FEED_PAGE_SIZE: 20,
  isMissingReadFunction: (e: { code: string }) => e.code === "PGRST202",
  loadFeed: jest.fn(),
}));
import { supabase } from "../src/lib/supabase";
import { loadFeed } from "../src/features/social/feed";
import { loadHomeFeed } from "../src/features/social/homeFeed";
const rpc = supabase!.rpc as jest.Mock;
beforeEach(() => jest.clearAllMocks());
test("mixed photos and workouts keep the server order and stable page cursor", async () => {
  const rows = Array.from({ length: 21 }, (_, i) => ({
    post: {
      id: `post-${i}`,
      created_at: "2026-10-24T12:00:00Z",
      kind: i % 2 ? "place" : "workout",
    },
  }));
  rpc.mockReturnValue({
    abortSignal: jest.fn().mockResolvedValue({ data: rows, error: null }),
  });
  const result = await loadHomeFeed(
    "owner",
    "following",
    null,
    new AbortController().signal,
  );
  expect(result.posts).toEqual(rows.slice(0, 20).map((r) => r.post));
  expect(result.next?.id).toBe("post-19");
  expect(rpc.mock.calls[0][1]).not.toHaveProperty("userId");
});
test("only a missing RPC falls back to the older workout feed", async () => {
  rpc.mockReturnValue({
    abortSignal: jest.fn().mockResolvedValue({ error: { code: "PGRST202" } }),
  });
  (loadFeed as jest.Mock).mockResolvedValue({ posts: [], next: null });
  await loadHomeFeed("owner", "following", null, new AbortController().signal);
  expect(loadFeed).toHaveBeenCalledTimes(1);
  jest.clearAllMocks();
  rpc.mockReturnValue({
    abortSignal: jest.fn().mockResolvedValue({ error: { code: "42501" } }),
  });
  await expect(
    loadHomeFeed("owner", "following", null, new AbortController().signal),
  ).rejects.toEqual({ code: "42501" });
  expect(loadFeed).not.toHaveBeenCalled();
});
test("leaving a screen does not start a fallback request", async () => {
  rpc.mockReturnValue({
    abortSignal: jest.fn().mockResolvedValue({ error: { code: "PGRST202" } }),
  });
  const control = new AbortController();
  control.abort();
  await expect(
    loadHomeFeed("owner", "following", null, control.signal),
  ).rejects.toThrow("VYRO_REQUEST_CANCELLED");
  expect(loadFeed).not.toHaveBeenCalled();
});
