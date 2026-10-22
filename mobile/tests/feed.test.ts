jest.mock("../src/lib/supabase", () => ({
  supabase: { rpc: jest.fn(), from: jest.fn() },
}));
import { supabase } from "../src/lib/supabase";
import { FEED_PAGE_SIZE, loadFeed } from "../src/features/social/feed";
const rpc = supabase!.rpc as jest.Mock;
const from = supabase!.from as jest.Mock;
const rows = Array.from({ length: 21 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  created_at: "2026-10-23T12:00:00+00:00",
  title: `Økt ${i}`,
  like_count: 0,
  liked: false,
  reposted: false,
}));
beforeEach(() => jest.clearAllMocks());
function response(data: unknown, error: unknown = null) {
  const abortSignal = jest.fn().mockResolvedValue({ data, error });
  rpc.mockReturnValue({ abortSignal });
  return abortSignal;
}
test("a page uses one request, returns a stable cursor and never accepts a caller's identity as RPC input", async () => {
  const abortSignal = response(rows);
  const signal = new AbortController().signal;
  const page = await loadFeed("viewer", "following", null, signal);
  expect(page.posts).toHaveLength(FEED_PAGE_SIZE);
  expect(page.next).toEqual({
    id: rows[19].id,
    created_at: rows[19].created_at,
  });
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith("vyro_feed", {
    p_kind: "following",
    p_limit: 21,
    p_before_created_at: null,
    p_before_id: null,
  });
  expect(abortSignal).toHaveBeenCalledWith(signal);
  expect(from).not.toHaveBeenCalled();
  response(rows.slice(0, 4));
  const last = await loadFeed("viewer", "reposted", page.next, signal);
  expect(last.next).toBeNull();
  expect(rpc.mock.lastCall?.[1]).toMatchObject({
    p_kind: "reposted",
    p_before_id: rows[19].id,
  });
});
test.each(["42501", "PGRST301", "57014"])(
  "server error %s never triggers a legacy retry",
  async (code) => {
    response(null, { code });
    await expect(
      loadFeed("viewer", "following", null, new AbortController().signal),
    ).rejects.toEqual({ code });
    expect(from).not.toHaveBeenCalled();
  },
);
test("cancelling an old screen also prevents its rollout fallback", async () => {
  const controller = new AbortController();
  response(null, { code: "PGRST202" });
  controller.abort();
  await expect(
    loadFeed("viewer", "following", null, controller.signal),
  ).rejects.toThrow("VYRO_REQUEST_CANCELLED");
  expect(from).not.toHaveBeenCalled();
});
test("an older backend still returns feed pages without fetching route JSON", async () => {
  response(null, { code: "PGRST202" });
  function builder(data: unknown) {
    const query: Record<string, jest.Mock> = {};
    for (const name of ["select", "eq", "in", "order", "limit", "or"])
      query[name] = jest.fn(() => query);
    query.abortSignal = jest.fn().mockResolvedValue({ data, error: null });
    return query;
  }
  const follows = builder([{ following_id: "runner" }]);
  const posts = builder(rows);
  from.mockReturnValueOnce(follows).mockReturnValueOnce(posts);
  const page = await loadFeed(
    "viewer",
    "following",
    null,
    new AbortController().signal,
  );
  expect(page.posts).toHaveLength(20);
  expect(posts.select.mock.calls[0][0]).not.toMatch(/\broute\b|\*/);
  expect(posts.in).toHaveBeenCalledWith("author_id", ["runner", "viewer"]);
  expect(posts.limit).toHaveBeenCalledWith(21);
});
