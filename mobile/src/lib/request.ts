export const REQUEST_TIMEOUT_MS = 12_000;

/** Bound each network attempt and forward cancellation without retrying writes. */
export function timeoutFetch(
  fetcher: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const source =
      init?.signal ??
      (typeof Request !== "undefined" && input instanceof Request
        ? input.signal
        : undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel = () => {};
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => {
        const error = new Error("VYRO_REQUEST_CANCELLED");
        error.name = "AbortError";
        reject(error);
        controller.abort();
      };
      source?.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(() => {
        const error = new Error("VYRO_REQUEST_TIMEOUT");
        error.name = "AbortError";
        reject(error);
        controller.abort();
      }, timeoutMs);
    });
    try {
      if (source?.aborted) cancel();
      return await Promise.race([
        cancelled,
        source?.aborted
          ? cancelled
          : fetcher(input, { ...init, signal: controller.signal }),
      ]);
    } finally {
      clearTimeout(timer);
      source?.removeEventListener("abort", cancel);
    }
  };
}
