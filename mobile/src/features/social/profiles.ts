import { client } from "./api";
import { useAuthStore } from "../../stores/useAuthStore";
import { applyProfilePatch } from "../../stores/useProfileStore";
import { stripPhotoMetadata } from "../places/model";
import type { PreparedPhoto } from "../places/photos";

export function requireOwner(owner: string) {
  if (useAuthStore.getState().session?.user.id !== owner)
    throw new Error("Kontoen er endret. Åpne siden på nytt.");
}
export async function changePrivacy(owner: string, value: boolean) {
  requireOwner(owner);
  const result = await client()
    .from("profiles")
    .update({ is_private: value })
    .eq("id", owner)
    .select("id")
    .single();
  if (result.error) throw result.error;
  requireOwner(owner);
  applyProfilePatch(owner, { is_private: value });
}
export async function changeAvatar(
  owner: string,
  photo: PreparedPhoto | null,
  previous?: string | null,
) {
  requireOwner(owner);
  const path = photo ? `${owner}/${photo.id}.jpg` : null;
  if (photo && path) {
    const bytes = stripPhotoMetadata(photo.bytes);
    if (bytes.byteLength > 2 * 1024 * 1024)
      throw new Error("Bildet er for stort. Velg et mindre bilde.");
    const upload = await client()
      .storage.from("profile-photos")
      .upload(path, bytes.buffer, {
        contentType: "image/jpeg",
        upsert: false,
        cacheControl: "60",
      });
    if (upload.error && String(upload.error.statusCode) !== "409")
      throw upload.error;
  }
  requireOwner(owner);
  const result = await client().rpc("vyro_set_avatar", { p_path: path });
  if (result.error) throw result.error;
  requireOwner(owner);
  applyProfilePatch(owner, { avatar_path: path });
  if (previous && previous !== path && previous.startsWith(`${owner}/`)) {
    // Old URLs expire shortly; failed cleanup never restores the old profile image.
    try {
      await client().storage.from("profile-photos").remove([previous]);
    } catch {
      /* Unreferenced images remain private. */
    }
  }
}
export type FollowState = "none" | "following" | "requested";
export async function changeFollow(
  owner: string,
  target: string,
  follow: boolean,
) {
  requireOwner(owner);
  const result = await client().rpc("vyro_follow", {
    p_target: target,
    p_follow: follow,
  });
  if (result.error) throw result.error;
  requireOwner(owner);
  if (!["none", "following", "requested"].includes(result.data))
    throw new Error("Uventet svar. Prøv igjen.");
  return result.data as FollowState;
}
