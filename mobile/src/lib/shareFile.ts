export type ExportFile = { filename: string; contents: string };
export function cleanExports() {
  /* Browser downloads are managed by the user. */
}

/** Browser export stays on-device; no upload service or public file URL. */
export async function shareFile(file: ExportFile, authorized: () => boolean) {
  if (!authorized()) throw new Error("Logg inn med kontoen som eier økten.");
  const url = URL.createObjectURL(
    new Blob([file.contents], { type: "application/gpx+xml" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Give the browser time to consume the URL before releasing the blob.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
