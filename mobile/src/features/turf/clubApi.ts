import { client } from "../social/api";
import { type Club } from "../clubs/api";
import type { GrowingTurf } from "./growth";

export type ClubTurf = GrowingTurf & { club_id: string; updated_at: string };
export type ClubScore = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  zones: number;
  distance_m: number;
  place: number;
};
export type ClubTurfCursor = { id: string; updated_at: string };

export async function loadClubContext(
  id: string,
  userId: string,
  signal: AbortSignal,
): Promise<Club> {
  const { data, error } = await client()
    .from("club_members")
    .select("clubs(id,name,description,owner_id,visibility,created_at)")
    .eq("club_id", id)
    .eq("user_id", userId)
    .abortSignal(signal)
    .single();
  if (error || !data?.clubs) throw new Error("TURF_CLUB_MEMBERSHIP");
  const count = await client()
    .from("club_members")
    .select("user_id", { count: "exact", head: true })
    .eq("club_id", id)
    .abortSignal(signal);
  if (count.error) throw count.error;
  return {
    ...(data.clubs as unknown as Club),
    member_count: count.count ?? undefined,
  };
}
export async function loadClubTurfs(
  clubId: string,
  signal: AbortSignal,
  cursor?: ClubTurfCursor,
) {
  const { data, error } = await client()
    .rpc("vyro_club_turfs", {
      p_club_id: clubId,
      p_before_updated: cursor?.updated_at ?? null,
      p_before_id: cursor?.id ?? null,
    })
    .abortSignal(signal);
  if (error) throw error;
  const rows = (data ?? []) as ClubTurf[];
  return {
    items: rows.slice(0, 40),
    next:
      rows.length > 40
        ? { id: rows[39].id, updated_at: rows[39].updated_at }
        : null,
  };
}
export async function loadClubScores(
  clubId: string,
  signal: AbortSignal,
  offset = 0,
) {
  const { data, error } = await client()
    .rpc("vyro_club_turf_results", { p_club_id: clubId, p_offset: offset })
    .abortSignal(signal);
  if (error) throw error;
  const rows = (data ?? []) as ClubScore[];
  return { items: rows.slice(0, 50), more: rows.length > 50 };
}
