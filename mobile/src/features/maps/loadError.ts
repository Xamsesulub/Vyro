// Native reports HTTP errors as text; GL JS exposes a numeric status.
// Extract only the status. Never return provider messages/URLs containing tokens.
export function mapErrorStatus(error: unknown): number | undefined {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  if (typeof status === "number") return status;
  const message =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null
        ? "error" in error
          ? error.error
          : "message" in error
            ? error.message
            : undefined
        : undefined;
  if (typeof message !== "string") return;
  const match = message.match(
    /\b(?:HTTP(?:\/[\d.]+)?(?:\s+(?:response|status|code))*|status(?:\s+code)?)\s*[:=]?\s*(401|403|429|5\d\d)\b/i,
  );
  return match ? Number(match[1]) : undefined;
}

export function mapLoadError(error: unknown): string {
  const status = mapErrorStatus(error);
  if (status === 429)
    return "Karttjenesten begrenser tilgangen akkurat nå. Vent litt før du prøver igjen.";
  if (status === 401 || status === 403)
    return "Karttilgangen ble avvist. Prøv igjen senere.";
  return "Kartet kunne ikke lastes. Kontroller nettforbindelsen og prøv igjen.";
}
