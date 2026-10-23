import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { randomUUID } from "expo-crypto";
import { bytesDataUri, stripPhotoMetadata } from "./model";
export type PreparedPhoto = {
  id: string;
  bytes: Uint8Array<ArrayBuffer>;
  preview: string;
};
export async function choosePhoto(): Promise<PreparedPhoto | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: false,
    exif: false,
    quality: 1,
  });
  if (picked.canceled || !picked.assets.length) return null;
  const asset = picked.assets[0];
  if ((asset.fileSize ?? 0) > 25 * 1024 * 1024)
    throw new Error("Velg et bilde under 25 MB.");
  const context = ImageManipulator.manipulate(asset.uri, { maxWidth: 1600 });
  try {
    if (asset.width > 1600 || asset.height > 1600)
      context.resize(
        asset.width >= asset.height ? { width: 1600 } : { height: 1600 },
      );
    const rendered = await context.renderAsync();
    try {
      const result = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.82,
        base64: true,
      });
      if (!result.base64) throw new Error("Bildet kunne ikke klargjøres.");
      const bytes = stripPhotoMetadata(
        Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0)),
      );
      return { id: randomUUID(), bytes, preview: bytesDataUri(bytes) };
    } finally {
      rendered.release();
    }
  } finally {
    context.release();
  }
}
