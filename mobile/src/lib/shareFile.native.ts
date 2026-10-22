import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export type ExportFile = { filename: string; contents: string };
let sharing = false;
export function cleanExports() {
  const directory = new Directory(Paths.cache, "vyro-exports");
  if (!directory.exists) return;
  for (const previous of directory.list()) {
    const createdAt = Number(previous.name.split("-")[0]);
    if (Number.isFinite(createdAt) && Date.now() - createdAt > 86_400_000)
      previous.delete();
  }
}
export async function shareFile(
  exported: ExportFile,
  authorized: () => boolean,
) {
  if (sharing) throw new Error("En eksport er allerede åpen.");
  sharing = true;
  let file: File | undefined;
  let delivered = false;
  try {
    if (!(await Sharing.isAvailableAsync()))
      throw new Error("Fildeling er ikke tilgjengelig på denne enheten.");
    if (!authorized()) throw new Error("Logg inn med kontoen som eier økten.");
    cleanExports();
    const directory = new Directory(
      Paths.cache,
      "vyro-exports",
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    directory.create({ intermediates: true });
    file = new File(directory, exported.filename);
    await file.write(exported.contents);
    if (!authorized()) throw new Error("Logg inn med kontoen som eier økten.");
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/gpx+xml",
      UTI: "com.topografix.gpx",
      dialogTitle: "Lagre eller del GPS-ruten",
    });
    delivered = true;
  } finally {
    // Android can resolve on handoff before the receiving app reads the file.
    // Keep successful exports in cache; clean after 24h on launch/next export.
    try {
      if (!delivered && file?.exists) file.delete();
    } finally {
      sharing = false;
    }
  }
}
