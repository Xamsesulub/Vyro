import { encryptedStorage, StringStorage } from "../src/lib/encryptedStorage";
function setup() {
  const values = new Map<string, string>();
  const storage: StringStorage = {
    getItem: async (k) => values.get(k) ?? null,
    setItem: async (k, v) => {
      values.set(k, v);
    },
    removeItem: async (k) => {
      values.delete(k);
    },
  };
  const cipher = {
    encrypt: jest.fn(async (v: string) => `sealed:${v}`),
    decrypt: jest.fn(async (v: string) => {
      if (!v.startsWith("sealed:")) throw new Error("corrupt");
      return v.slice(7);
    }),
  };
  return {
    values,
    storage,
    cipher,
    adapter: encryptedStorage(storage, cipher),
  };
}
test("migrates and verifies before removing plaintext", async () => {
  const s = setup();
  s.values.set("data", "økten");
  expect(await s.adapter.getItem("data")).toBe("økten");
  expect(s.values.has("data")).toBe(false);
  expect(s.values.get("data.encrypted-v1")).toBe("sealed:økten");
});
test("corruption never falls back to plaintext or overwrites recoverable data", async () => {
  const s = setup();
  s.values.set("data", "old");
  s.values.set("data.encrypted-v1", "broken");
  await expect(s.adapter.getItem("data")).rejects.toThrow();
  await expect(s.adapter.setItem("data", "defaults")).rejects.toThrow();
  expect(s.values.get("data")).toBe("old");
  expect(s.values.get("data.encrypted-v1")).toBe("broken");
});
test("failed migration keeps legacy data and blocks later writes", async () => {
  const s = setup();
  s.values.set("data", "recover me");
  s.cipher.encrypt.mockRejectedValue(new Error("key unavailable"));
  await expect(s.adapter.getItem("data")).rejects.toThrow();
  await expect(s.adapter.setItem("data", "defaults")).rejects.toThrow();
  expect(s.values.get("data")).toBe("recover me");
});
test("queued writes preserve ordering", async () => {
  const s = setup();
  await Promise.all([
    s.adapter.setItem("data", "first"),
    s.adapter.setItem("data", "last"),
  ]);
  expect(await s.adapter.getItem("data")).toBe("last");
});
