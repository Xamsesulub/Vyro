import { client } from "./api";
import {
  FeedCursor,
  FeedKind,
  FeedPost,
  FEED_PAGE_SIZE,
  isMissingReadFunction,
  loadFeed,
} from "./feed";
import { PlacePost } from "../places/model";
export type HomePost = (FeedPost & { kind?: "workout" }) | PlacePost;
export async function loadHomeFeed(
  user: string,
  kind: FeedKind,
  cursor: FeedCursor | null,
  signal: AbortSignal,
): Promise<{ posts: HomePost[]; next: FeedCursor | null }> {
  const result = await client()
    .rpc("vyro_home_feed", {
      p_kind: kind,
      p_limit: FEED_PAGE_SIZE + 1,
      p_before_created_at: cursor?.created_at ?? null,
      p_before_id: cursor?.id ?? null,
    })
    .abortSignal(signal);
  if (signal.aborted) throw new Error("VYRO_REQUEST_CANCELLED");
  if (result.error && isMissingReadFunction(result.error))
    return loadFeed(user, kind, cursor, signal);
  if (result.error) throw result.error;
  const rows = (result.data as { post: HomePost }[]).map((row) => row.post);
  const posts = rows.slice(0, FEED_PAGE_SIZE);
  const last = posts.at(-1);
  return {
    posts,
    next:
      rows.length > FEED_PAGE_SIZE && last
        ? { id: last.id, created_at: last.created_at }
        : null,
  };
}
