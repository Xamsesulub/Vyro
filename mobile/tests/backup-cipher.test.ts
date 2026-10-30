// Exercise the format with Node's real AES-GCM, including its authentication tag.
jest.mock("expo-crypto", () => {
  const crypto = require("node:crypto");
  return {
    AESEncryptionKey: {
      generate: async () => ({
        encoded: async () => crypto.randomBytes(32).toString("hex"),
      }),
      import: async (key: string) => Buffer.from(key, "hex"),
    },
    AESSealedData: {
      fromCombined: (value: string) => Buffer.from(value, "base64"),
    },
    aesEncryptAsync: async (
      plain: Uint8Array,
      key: Buffer,
      options: { additionalData: Uint8Array },
    ) => {
      const iv = crypto.randomBytes(12),
        enc = crypto.createCipheriv("aes-256-gcm", key, iv);
      enc.setAAD(options.additionalData);
      const bytes = Buffer.concat([
        iv,
        enc.update(plain),
        enc.final(),
        enc.getAuthTag(),
      ]);
      return { combined: async () => bytes.toString("base64") };
    },
    aesDecryptAsync: async (
      bytes: Buffer,
      key: Buffer,
      options: { additionalData: Uint8Array },
    ) => {
      const dec = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        bytes.subarray(0, 12),
      );
      dec.setAAD(options.additionalData);
      dec.setAuthTag(bytes.subarray(-16));
      return Buffer.concat([dec.update(bytes.subarray(12, -16)), dec.final()]);
    },
  };
});
import {
  newRecoveryCode,
  normalizeRecoveryCode,
  openBackup,
  sealBackup,
} from "../src/features/backup/cipher";
test("random recovery codes round-trip Unicode with fresh nonces", async () => {
  const key = await newRecoveryCode();
  expect(normalizeRecoveryCode(key)).toHaveLength(64);
  const a = await sealBackup("Privat økt 🏃", key, "owner", "route", "key");
  const b = await sealBackup("Privat økt 🏃", key, "owner", "route", "key");
  expect(a).not.toEqual(b);
  expect(await openBackup(a, key, "owner", "route", "key")).toBe(
    "Privat økt 🏃",
  );
  expect(a).not.toContain("Privat");
});
test("wrong key, changed owner, workout, version context or ciphertext fail closed", async () => {
  const key = await newRecoveryCode(),
    cipher = await sealBackup("private", key, "a", "r", "k");
  for (const args of [
    [await newRecoveryCode(), "a", "r", "k"],
    [key, "b", "r", "k"],
    [key, "a", "other", "k"],
    [key, "a", "r", "other"],
  ]) {
    await expect(
      openBackup(cipher, args[0], args[1], args[2], args[3]),
    ).rejects.toThrow();
  }
  const bytes = Buffer.from(cipher, "base64");
  bytes[15] ^= 1;
  await expect(
    openBackup(bytes.toString("base64"), key, "a", "r", "k"),
  ).rejects.toThrow();
  expect(() => normalizeRecoveryCode("password")).toThrow();
});
