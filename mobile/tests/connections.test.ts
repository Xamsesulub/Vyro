import {
  connectionCounts,
  loadConnections,
} from "../src/features/social/connections";
import { supabase } from "../src/lib/supabase";
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));
jest.mock("../src/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
function query(result: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockResolvedValue(result),
  };
}
beforeEach(() => jest.clearAllMocks());
test("counts use two bounded HEAD queries and missing counts are never shown as zero", async () => {
  const followers = query({ count: 2 }),
    following = query({ count: 3 });
  jest
    .mocked(supabase!.from)
    .mockReturnValueOnce(followers as never)
    .mockReturnValueOnce(following as never);
  const signal = new AbortController().signal;
  await expect(connectionCounts("a", signal)).resolves.toEqual({
    followers: 2,
    following: 3,
  });
  expect(followers.select).toHaveBeenCalledWith("follower_id", {
    count: "exact",
    head: true,
  });
  expect(followers.eq).toHaveBeenCalledWith("following_id", "a");
  expect(following.eq).toHaveBeenCalledWith("follower_id", "a");
  expect(following.abortSignal).toHaveBeenCalledWith(signal);
  jest.mocked(supabase!.from).mockReturnValue(query({ count: null }) as never);
  await expect(connectionCounts("a", signal)).rejects.toThrow();
});
test.each(["following", "followers"] as const)(
  "%s list uses the right relation and fetches 30 plus one for pagination",
  async (kind) => {
    const rows = Array.from({ length: 31 }, (_, i) => ({
      profiles: {
        id: String(i),
        username: `runner_${i}`,
        display_name: `Løper ${i}`,
      },
    }));
    const q = query({ data: rows });
    jest.mocked(supabase!.from).mockReturnValue(q as never);
    const result = await loadConnections(
      "a",
      kind,
      30,
      new AbortController().signal,
    );
    expect(result.people).toEqual(rows.slice(0, 30).map((r) => r.profiles));
    expect(result.more).toBe(true);
    expect(q.range).toHaveBeenCalledWith(30, 60);
    expect(q.eq).toHaveBeenCalledWith(
      kind === "following" ? "follower_id" : "following_id",
      "a",
    );
    expect(q.select).toHaveBeenCalledWith(
      expect.stringContaining(
        kind === "following"
          ? "follows_following_id_fkey"
          : "follows_follower_id_fkey",
      ),
    );
  },
);
