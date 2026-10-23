// Do not expose provider URLs (which may contain tokens) in the UI or logs.
export function mapLoadError(error: unknown): string {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  if (status === 429)
    return "Karttjenesten begrenser tilgangen akkurat nå. Prøv igjen senere.";
  if (status === 401 || status === 403)
    return "Karttilgangen ble avvist. Kontroller Mapbox-oppsettet.";
  return "Kartet kunne ikke lastes. Kontroller nettforbindelsen og prøv igjen.";
}
