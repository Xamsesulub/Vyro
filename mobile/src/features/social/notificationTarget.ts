import { client } from "./api";
import { requireOwner } from "./profiles";

export function isNotificationId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
export type NotificationTarget = {
  postId: string | null;
  type: "workout" | "place";
  comments: boolean;
  username: string;
};
export async function loadNotificationTarget(
  owner: string,
  id: string,
): Promise<NotificationTarget | null> {
  requireOwner(owner);
  if (!isNotificationId(id)) return null;
  const result = await client()
    .rpc("vyro_notification_target", { p_notice: id })
    .abortSignal(AbortSignal.timeout(8000));
  if (result.error) throw result.error;
  requireOwner(owner);
  const data = result.data;
  if (
    !data ||
    (data.postId !== null && !isNotificationId(data.postId)) ||
    !["workout", "place"].includes(data.type) ||
    typeof data.comments !== "boolean" ||
    typeof data.username !== "string"
  )
    return null;
  return data as NotificationTarget;
}
