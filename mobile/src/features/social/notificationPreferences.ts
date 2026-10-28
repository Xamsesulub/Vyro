import { client } from "./api";
import { requireOwner } from "./profiles";

export const notificationCategories = [
  {
    key: "followers",
    title: "Følgere",
    description: "Nye følgere, forespørsler og godkjenninger.",
  },
  {
    key: "comments",
    title: "Kommentarer",
    description: "Når noen kommenterer innlegget ditt.",
  },
  {
    key: "likes",
    title: "Likerklikk",
    description: "Når noen liker innlegget ditt.",
  },
  {
    key: "posts",
    title: "Nye innlegg",
    description: "Innlegg fra personer du følger.",
  },
] as const;
export type NotificationCategory =
  (typeof notificationCategories)[number]["key"];
export type Channels = { in_app: boolean; push: boolean };
export type NotificationPreferences = Record<NotificationCategory, Channels>;
export function defaultNotificationPreferences(): NotificationPreferences {
  return {
    followers: { in_app: true, push: true },
    comments: { in_app: true, push: true },
    likes: { in_app: true, push: true },
    posts: { in_app: true, push: false },
  };
}
export async function loadNotificationPreferences(owner: string) {
  requireOwner(owner);
  const result = await client()
    .from("notification_preferences")
    .select("category,in_app,push")
    .eq("owner_id", owner)
    .abortSignal(AbortSignal.timeout(8000));
  if (result.error) throw result.error;
  requireOwner(owner);
  const preferences = defaultNotificationPreferences();
  for (const row of result.data ?? []) {
    if (notificationCategories.some((c) => c.key === row.category))
      preferences[row.category as NotificationCategory] = {
        in_app: row.in_app,
        push: row.push,
      };
  }
  return preferences;
}
export async function saveNotificationPreference(
  owner: string,
  category: NotificationCategory,
  channels: Channels,
) {
  requireOwner(owner);
  const result = await client()
    .from("notification_preferences")
    .upsert(
      { owner_id: owner, category, ...channels },
      { onConflict: "owner_id,category" },
    )
    .abortSignal(AbortSignal.timeout(8000));
  if (result.error) throw result.error;
  requireOwner(owner);
}
