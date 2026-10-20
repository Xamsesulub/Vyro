export type StringStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
export type Cipher = {
  encrypt(value: string, allowCreate: boolean): Promise<string>;
  decrypt(value: string): Promise<string>;
};

// Serialize migration and writes. A failed read must never overwrite recoverable data.
export function encryptedStorage(
  storage: StringStorage,
  cipher: Cipher,
): StringStorage {
  let queue: Promise<unknown> = Promise.resolve();
  let blocked = false;
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work);
    queue = next.catch(() => undefined);
    return next;
  };
  const target = (key: string) => `${key}.encrypted-v1`;
  return {
    getItem: (key) =>
      serial(async () => {
        try {
          const encrypted = await storage.getItem(target(key));
          if (encrypted !== null) {
            const value = await cipher.decrypt(encrypted);
            await storage.removeItem(key);
            return value;
          }
          const legacy = await storage.getItem(key);
          if (legacy === null) return null;
          const sealed = await cipher.encrypt(legacy, true);
          await storage.setItem(target(key), sealed);
          const verified = await storage.getItem(target(key));
          if (verified === null || (await cipher.decrypt(verified)) !== legacy)
            throw new Error("Storage verification failed");
          await storage.removeItem(key);
          return legacy;
        } catch (error) {
          blocked = true;
          throw error;
        }
      }),
    setItem: (key, value) =>
      serial(async () => {
        if (blocked) throw new Error("Storage locked after failed recovery");
        const existing = await storage.getItem(target(key));
        await storage.setItem(
          target(key),
          await cipher.encrypt(value, existing === null),
        );
      }),
    removeItem: (key) =>
      serial(async () => {
        if (blocked) throw new Error("Storage locked after failed recovery");
        await storage.removeItem(target(key));
        await storage.removeItem(key);
      }),
  };
}
