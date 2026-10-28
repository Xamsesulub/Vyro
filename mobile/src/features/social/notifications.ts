import { client, profileColumns, type Profile } from "./api";
import { requireOwner } from "./profiles";
export type Notice = {
  id: string;
  actor_id: string;
  kind: "follow" | "request" | "accepted" | "comment" | "like" | "post";
  created_at: string;
  read_at: string | null;
  profiles: Profile;
};
export type FollowRequest = {
  requester_id: string;
  created_at: string;
  profiles: Profile;
};
export const noticeText = {
  follow: "begynte å følge deg",
  request: "vil følge deg",
  accepted: "godkjente følgeforespørselen din",
  comment: "kommenterte innlegget ditt",
  like: "likte innlegget ditt",
  post: "delte et nytt innlegg",
};
export async function loadNotices(
  owner: string,
  signal: AbortSignal,
  before?: { created_at: string; id: string },
) {
  let query = client()
    .from("social_notifications")
    .select(
      `id,actor_id,kind,created_at,read_at,profiles!social_notifications_actor_id_fkey(${profileColumns})`,
    )
    .eq("recipient_id", owner)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(31);
  if (before)
    query = query.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  const result = await query.abortSignal(signal);
  if (result.error) throw result.error;
  requireOwner(owner);
  const rows = result.data as unknown as Notice[];
  return { rows: rows.slice(0, 30), more: rows.length > 30 };
}
export async function loadRequests(owner: string, signal: AbortSignal) {
  const result = await client()
    .from("follow_requests")
    .select(
      `requester_id,created_at,profiles!follow_requests_requester_id_fkey(${profileColumns})`,
    )
    .eq("recipient_id", owner)
    .order("created_at")
    .limit(50)
    .abortSignal(signal);
  if (result.error) throw result.error;
  requireOwner(owner);
  return result.data as unknown as FollowRequest[];
}
export async function respondFollow(
  owner: string,
  requester: string,
  accept: boolean,
) {
  requireOwner(owner);
  const result = await client().rpc("vyro_respond_follow", {
    p_requester: requester,
    p_accept: accept,
  });
  if (result.error) throw result.error;
  requireOwner(owner);
}
