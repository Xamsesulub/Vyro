import { secureSessionStore } from "../src/lib/secureSession";
function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: async (k: string) => {
      data.delete(k);
    },
  };
}
test("migrates long sessions into small secure items, removing plaintext", async () => {
  const secure = memory(),
    legacy = memory();
  const session = "token".repeat(900);
  await legacy.setItem("auth", session);
  const adapter = secureSessionStore(secure, legacy);
  expect(await adapter.getItem("auth")).toBe(session);
  expect(legacy.data.size).toBe(0);
  expect([...secure.data.values()].every((v) => v.length <= 500)).toBe(true);
  await adapter.removeItem("auth");
  expect(secure.data.size).toBe(0);
  expect(await adapter.getItem("auth")).toBeNull();
});
test("failed secure migration retains recoverable legacy session", async () => {
  const secure = memory(),
    legacy = memory();
  await legacy.setItem("auth", "old-token");
  secure.setItem = async () => {
    throw new Error("keychain locked");
  };
  await expect(
    secureSessionStore(secure, legacy).getItem("auth"),
  ).rejects.toThrow();
  expect(await legacy.getItem("auth")).toBe("old-token");
});
test("sign-out queued during refresh removes the refreshed session too", async () => {
  const secure = memory(),
    legacy = memory();
  const adapter = secureSessionStore(secure, legacy);
  await Promise.all([
    adapter.setItem("auth", "new-token"),
    adapter.removeItem("auth"),
  ]);
  expect(await adapter.getItem("auth")).toBeNull();
  expect(secure.data.size).toBe(0);
});
