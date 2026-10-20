type Store = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
// Chunk below the native keychain item limit; commit the pointer last.
// Serialize operations so refresh and sign-out cannot resurrect an old token.
export function secureSessionStore(secure: Store, legacy: Store) {
  let pending: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = pending.then(operation, operation);
    pending = next.catch(() => undefined);
    return next;
  }
  type Manifest = { generation: string; count: number };
  const pointer = (key: string) => `${key}.secure`;
  async function manifest(key: string): Promise<Manifest | null> {
    const raw = await secure.getItem(pointer(key));
    if (!raw) return null;
    const m = JSON.parse(raw) as Manifest;
    if (
      !/^[a-z0-9-]+$/.test(m.generation) ||
      !Number.isInteger(m.count) ||
      m.count < 1 ||
      m.count > 100
    )
      throw new Error("Invalid secure session");
    return m;
  }
  async function erase(key: string, m: Manifest | null) {
    if (m)
      for (let i = 0; i < m.count; i++)
        await secure.removeItem(`${key}.${m.generation}.${i}`);
  }
  async function write(key: string, value: string) {
    if (!value.length || value.length > 50000)
      throw new Error("Session storage limit");
    const old = await manifest(key);
    const m = {
      generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      count: Math.ceil(value.length / 500),
    };
    try {
      for (let i = 0; i < m.count; i++)
        await secure.setItem(
          `${key}.${m.generation}.${i}`,
          value.slice(i * 500, (i + 1) * 500),
        );
      await secure.setItem(pointer(key), JSON.stringify(m));
    } catch (e) {
      await erase(key, m).catch(() => undefined);
      throw e;
    }
    await legacy.removeItem(key);
    await erase(key, old);
  }
  return {
    getItem: (key: string) =>
      serial(async () => {
        const m = await manifest(key);
        if (!m) {
          const old = await legacy.getItem(key);
          if (old !== null) await write(key, old);
          return old;
        }
        const chunks = await Promise.all(
          Array.from({ length: m.count }, (_, i) =>
            secure.getItem(`${key}.${m.generation}.${i}`),
          ),
        );
        if (chunks.some((c) => c === null))
          throw new Error("Incomplete secure session");
        // Also retry plaintext cleanup after a previous interrupted migration.
        await legacy.removeItem(key);
        return chunks.join("");
      }),
    setItem: (key: string, value: string) => serial(() => write(key, value)),
    removeItem: (key: string) =>
      serial(async () => {
        const m = await manifest(key);
        await legacy.removeItem(key);
        await secure.removeItem(pointer(key));
        await erase(key, m);
      }),
  };
}
