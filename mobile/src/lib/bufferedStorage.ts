import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { StringStorage } from "./encryptedStorage";

/** Keep at most one in-flight write and one latest snapshot. Serialize only on write. */
export function bufferedStorage<S extends object>(
  storage: StringStorage,
  options: {
    delayMs: number;
    defer: (next: S, previous: S) => boolean;
    encode?: (value: StorageValue<S>) => string;
    onError: () => void;
    onSuccess: () => void;
  },
): PersistStorage<S> & {
  flush: () => Promise<void>;
  retry: () => Promise<void>;
} {
  type Snapshot = { key: string; value: StorageValue<S>; urgent: boolean };
  let latest: Snapshot | undefined;
  let pending: Snapshot | undefined;
  let writing: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastWriteAt = 0;
  let readable = false;
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const schedule = () => {
    if (!timer)
      timer = setTimeout(
        () => {
          clearTimer();
          void drain();
        },
        Math.min(
          options.delayMs,
          Math.max(0, lastWriteAt + options.delayMs - Date.now()),
        ),
      );
  };
  const drain = (): Promise<void> => {
    if (writing) return writing;
    if (!pending) return Promise.resolve();
    const snapshot = pending;
    pending = undefined;
    lastWriteAt = Date.now();
    // Catch synchronous serialization errors as well as failed disk writes.
    writing = Promise.resolve()
      .then(async () => {
        try {
          await storage.setItem(
            snapshot.key,
            (options.encode ?? JSON.stringify)(snapshot.value),
          );
          options.onSuccess();
        } catch {
          options.onError();
        }
      })
      .finally(() => {
        writing = undefined;
        if (pending?.urgent) void drain();
        else if (pending) schedule();
      });
    return writing;
  };
  const flush = async () => {
    clearTimer();
    if (pending) pending.urgent = true;
    while (writing || pending) {
      await (writing ?? drain());
      clearTimer();
    }
  };
  return {
    async getItem(key) {
      await flush();
      readable = false;
      const raw = await storage.getItem(key);
      const value: StorageValue<S> | null =
        raw === null ? null : JSON.parse(raw);
      if (value !== null && (!value.state || typeof value.state !== "object"))
        throw new Error("Invalid saved state");
      readable = true;
      latest = value ? { key, value, urgent: true } : undefined;
      return value;
    },
    setItem(key, value) {
      // A failed recovery must never replace existing data with default state.
      if (!readable) return;
      const previous = latest?.value;
      if (
        previous &&
        value.version === previous.version &&
        Object.keys(value.state).every((field) =>
          Object.is(
            value.state[field as keyof S],
            previous.state[field as keyof S],
          ),
        )
      )
        return;
      const urgent =
        !!pending?.urgent ||
        !previous ||
        value.version !== previous.version ||
        !options.defer(value.state, previous.state);
      latest = { key, value, urgent };
      pending = latest;
      if (urgent) {
        clearTimer();
        void drain();
      } else schedule();
    },
    async removeItem(key) {
      await flush();
      if (!readable) throw new Error("Storage locked after failed recovery");
      await storage.removeItem(key);
      latest = undefined;
    },
    flush,
    async retry() {
      if (!readable || !latest) return;
      pending = { ...latest, urgent: true };
      await flush();
    },
  };
}
