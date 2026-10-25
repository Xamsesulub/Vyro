import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { client, type Profile } from "./api";

export async function connectionCounts(owner: string, signal: AbortSignal) {
  const [followers, following] = await Promise.all([
    client()
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", owner)
      .abortSignal(signal),
    client()
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", owner)
      .abortSignal(signal),
  ]);
  if (followers.error || following.error)
    throw followers.error ?? following.error;
  if (followers.count == null || following.count == null)
    throw new Error("Missing counts");
  return { followers: followers.count, following: following.count };
}
export function useConnectionCounts(owner?: string) {
  const [value, setValue] = useState<{
    owner: string;
    followers: number;
    following: number;
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!owner) return;
      const request = new AbortController();
      void connectionCounts(owner, request.signal)
        .then((counts) => {
          if (!request.signal.aborted) setValue({ owner, ...counts });
        })
        .catch(() => {
          if (!request.signal.aborted) setValue(null);
        });
      return () => request.abort();
    }, [owner]),
  );
  return value?.owner === owner ? value : null;
}
export type ConnectionKind = "followers" | "following";
export async function loadConnections(
  owner: string,
  kind: ConnectionKind,
  offset: number,
  signal: AbortSignal,
) {
  const follower = kind === "followers";
  const { data, error } = await client()
    .from("follows")
    .select(
      follower
        ? "profiles!follows_follower_id_fkey(id,username,display_name)"
        : "profiles!follows_following_id_fkey(id,username,display_name)",
    )
    .eq(follower ? "following_id" : "follower_id", owner)
    .order("created_at", { ascending: false })
    .order(follower ? "follower_id" : "following_id")
    .range(offset, offset + 30)
    .abortSignal(signal);
  if (error) throw error;
  const rows = data as unknown as { profiles: Profile }[];
  return {
    people: rows.slice(0, 30).map((row) => row.profiles),
    more: rows.length > 30,
  };
}
