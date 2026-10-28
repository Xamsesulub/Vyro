import { client, Post } from "./api";

export const FEED_PAGE_SIZE = 20;
export type FeedKind = "following" | "reposted";
export type FeedCursor = { created_at: string; id: string };
export type ReactionSummary = {
  like_count: number;
  liked: boolean;
  reposted: boolean;
};
export type FeedPost = Omit<Post, "route"> & Partial<ReactionSummary>;
export type FeedPage = { posts: FeedPost[]; next: FeedCursor | null };

export function isMissingReadFunction(error: unknown) {
  return ["PGRST202", "42883"].includes(
    (error as { code?: string })?.code ?? "",
  );
}

export async function loadFeed(
  userId: string,
  kind: FeedKind,
  cursor: FeedCursor | null,
  signal: AbortSignal,
): Promise<FeedPage> {
  const result = await client()
    .rpc("vyro_feed", {
      p_kind: kind,
      p_limit: FEED_PAGE_SIZE + 1,
      p_before_created_at: cursor?.created_at ?? null,
      p_before_id: cursor?.id ?? null,
    })
    .abortSignal(signal);
  if (signal.aborted) throw new Error("VYRO_REQUEST_CANCELLED");
  // Compatibility during rollout. Never fall back on authorization/network errors.
  if (result.error && isMissingReadFunction(result.error))
    return legacyFeed(userId, kind, cursor, signal);
  if (result.error) throw result.error;
  return feedPage(result.data as FeedPost[]);
}

function feedPage(rows: FeedPost[]): FeedPage {
  const posts = rows.slice(0, FEED_PAGE_SIZE);
  const last = posts.at(-1);
  return {
    posts,
    next:
      rows.length > FEED_PAGE_SIZE && last
        ? { created_at: last.created_at, id: last.id }
        : null,
  };
}

// Retain access to the currently deployed schema until the new migration is run.
// The legacy API caps follow/repost discovery; the RPC removes that old limit.
async function legacyFeed(
  userId: string,
  kind: FeedKind,
  cursor: FeedCursor | null,
  signal: AbortSignal,
) {
  const follows = kind === "following";
  const related = await client()
    .from(follows ? "follows" : "reposts")
    .select(follows ? "following_id" : "post_id")
    .eq(follows ? "follower_id" : "user_id", userId)
    .limit(1000)
    .abortSignal(signal);
  if (related.error) throw related.error;
  const ids = (related.data as unknown as Record<string, string>[]).map(
    (row) => row[follows ? "following_id" : "post_id"],
  );
  if (follows) ids.push(userId);
  if (!ids.length) return { posts: [], next: null };
  let query = client()
    .from("posts")
    .select(
      "id,author_id,title,sport,distance_km,seconds,recorded_at,created_at,audience,profiles!posts_author_id_fkey(id,username,display_name,is_private,avatar_path)",
    )
    .in(follows ? "author_id" : "id", ids)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);
  if (cursor) {
    // Cursor values originate in the server response; validate before PostgREST's filter grammar.
    if (
      !/^[0-9a-f-]{36}$/i.test(cursor.id) ||
      !/^[0-9T:.+Z-]+$/.test(cursor.created_at)
    )
      throw new Error("Invalid feed cursor");
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }
  const result = await query.abortSignal(signal);
  if (result.error) throw result.error;
  return feedPage(result.data as unknown as FeedPost[]);
}
