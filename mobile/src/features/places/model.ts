import { Profile } from "../social/api";
export type PlacePost = {
  kind: "place";
  id: string;
  author_id: string;
  caption: string;
  place_name: string;
  photo_path: string;
  audience: "followers" | "everyone";
  created_at: string;
  profiles: Profile;
};
export const PHOTO_LIMIT = 5 * 1024 * 1024;
export function validatePlace(caption: string, place: string) {
  if (!caption.trim() || caption.trim().length > 1000)
    throw new Error("Skriv en bildetekst på mellom 1 og 1000 tegn.");
  if (place.trim().length > 100)
    throw new Error("Stedsnavnet kan ha opptil 100 tegn.");
}
// Re-encoding handles pixel orientation. Remove EXIF/XMP/IPTC/comment segments
// as a second boundary before upload; filenames and GPS metadata are not sent.
export function stripPhotoMetadata(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  if (bytes.length > PHOTO_LIMIT || bytes[0] !== 255 || bytes[1] !== 216)
    throw new Error("Velg et gyldig bilde på maks 5 MB.");
  const chunks: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  let scan = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 255) throw new Error("Bildet kunne ikke leses.");
    const start = offset;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218) {
      chunks.push(bytes.subarray(start));
      scan = true;
      break;
    }
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length)
      throw new Error("Bildet kunne ikke leses.");
    if (marker !== 225 && marker !== 237 && marker !== 254)
      chunks.push(bytes.subarray(start, offset + length));
    offset += length;
  }
  if (!scan) throw new Error("Bildet inneholder ingen bildedata.");
  const clean = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let cursor = 0;
  for (const chunk of chunks) {
    clean.set(chunk, cursor);
    cursor += chunk.length;
  }
  return clean;
}
export function bytesDataUri(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:image/jpeg;base64,${btoa(binary)}`;
}
