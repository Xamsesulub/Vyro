import { client, Profile } from "../social/api";
export type Club = {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  visibility: "private" | "open";
  created_at: string;
  member_count?: number;
};
export type Invitation = {
  id: string;
  club_id: string;
  invitee_id: string;
  invited_by: string;
  clubs: Club;
};
export type Member = { user_id: string; profiles: Profile };
export function validateClub(name: string, description: string) {
  if (name.trim().length < 2 || name.trim().length > 60)
    throw new Error("Klubbnavnet må ha mellom 2 og 60 tegn.");
  if (description.trim().length > 500)
    throw new Error("Beskrivelsen kan ha opptil 500 tegn.");
}
export async function createClub(
  name: string,
  description: string,
  visibility: Club["visibility"] = "private",
) {
  validateClub(name, description);
  const result = await client().rpc("create_club", {
    p_name: name.trim(),
    p_description: description.trim(),
    p_visibility: visibility,
  });
  if (result.error) throw result.error;
  return result.data as string;
}
export type ClubPage = { items: Club[]; more: boolean };
export async function loadClubPage(
  kind: "mine" | "discover",
  before?: Club,
  signal?: AbortSignal,
): Promise<ClubPage> {
  const query = client().rpc("vyro_clubs", {
    p_kind: kind,
    p_limit: 21,
    p_before_created_at: before?.created_at ?? null,
    p_before_id: before?.id ?? null,
  });
  const result = await (signal ? query.abortSignal(signal) : query);
  if (result.error) throw result.error;
  const items = (result.data ?? []) as Club[];
  return { items: items.slice(0, 20), more: items.length > 20 };
}
export async function joinClub(id: string) {
  const result = await client().rpc("join_open_club", { p_club: id });
  if (result.error) throw result.error;
}
export async function loadClubs(userId: string, signal: AbortSignal) {
  const [clubs, discovery, invitations] = await Promise.all([
    loadClubPage("mine", undefined, signal),
    loadClubPage("discover", undefined, signal),
    client()
      .from("club_invitations")
      .select(
        "id,club_id,invitee_id,invited_by,clubs(id,name,description,owner_id,visibility,created_at)",
      )
      .eq("invitee_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)
      .abortSignal(signal),
  ]);
  if (invitations.error) throw invitations.error;
  return {
    clubs,
    discovery,
    invitations: invitations.data as unknown as Invitation[],
  };
}
export async function respondInvitation(id: string, accept: boolean) {
  const result = await client().rpc("respond_club_invitation", {
    p_invitation: id,
    p_accept: accept,
  });
  if (result.error) throw result.error;
  return result.data as string;
}
