import { client } from "../social/api";
import { useAuthStore } from "../../stores/useAuthStore";
import { stripPhotoMetadata, validatePlace } from "./model";
import type { PreparedPhoto } from "./photos";
export async function publishPlace(
  owner: string,
  photo: PreparedPhoto,
  caption: string,
  place: string,
  audience: "followers" | "everyone",
) {
  validatePlace(caption, place);
  const sameAccount = () => {
    if (useAuthStore.getState().session?.user.id !== owner)
      throw new Error("Kontoen er endret. Åpne innlegget på nytt.");
  };
  sameAccount();
  const path = `${owner}/${photo.id}.jpg`;
  const uploaded = await client()
    .storage.from("place-photos")
    .upload(path, stripPhotoMetadata(photo.bytes).buffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "60",
    });
  // The stable draft ID makes retries safe after interrupted uploads/publications.
  if (uploaded.error && String(uploaded.error.statusCode) !== "409")
    throw uploaded.error;
  sameAccount();
  const result = await client().rpc("publish_place", {
    p_id: photo.id,
    p_caption: caption.trim(),
    p_place_name: place.trim(),
    p_audience: audience,
  });
  if (result.error) throw result.error;
  sameAccount();
  return result.data as string;
}
export async function removePlace(id: string, owner: string, path: string) {
  if (useAuthStore.getState().session?.user.id !== owner)
    throw new Error("Kontoen er endret.");
  const result = await client()
    .from("place_posts")
    .delete()
    .eq("id", id)
    .eq("author_id", owner)
    .select("id");
  if (result.error) throw result.error;
  if (!result.data?.length)
    throw new Error("Innlegget finnes ikke eller er allerede fjernet.");
  // Removing the row immediately revokes other users' media access. Storage
  // deletion is best-effort; a failed cleanup never restores a shared post.
  if (useAuthStore.getState().session?.user.id === owner)
    await client().storage.from("place-photos").remove([path]);
}
