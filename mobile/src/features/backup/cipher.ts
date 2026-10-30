import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
} from "expo-crypto";

// A random 256-bit key, never a password. The formatted key is the recovery code.
export function normalizeRecoveryCode(code: string) {
  const key = code.replace(/[\s-]/g, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new Error("Skriv inn hele gjenopprettingskoden (64 tegn).");
  return key;
}
export async function newRecoveryCode() {
  const key = await AESEncryptionKey.generate();
  return (await key.encoded("hex")).match(/.{8}/g)!.join("-").toUpperCase();
}
const context = (owner: string, id: string, keyId: string) =>
  new TextEncoder().encode(
    JSON.stringify(["vyro-backup", 1, owner, id, keyId]),
  );
export async function sealBackup(
  plain: string,
  code: string,
  owner: string,
  id: string,
  keyId: string,
) {
  const sealed = await aesEncryptAsync(
    new TextEncoder().encode(plain),
    await AESEncryptionKey.import(normalizeRecoveryCode(code), "hex"),
    { additionalData: context(owner, id, keyId) },
  );
  return sealed.combined("base64");
}
export async function openBackup(
  ciphertext: string,
  code: string,
  owner: string,
  id: string,
  keyId: string,
) {
  if (typeof ciphertext !== "string" || ciphertext.length > 3_500_000)
    throw new Error("Ugyldig sikkerhetskopi.");
  const plain = await aesDecryptAsync(
    AESSealedData.fromCombined(ciphertext),
    await AESEncryptionKey.import(normalizeRecoveryCode(code), "hex"),
    { additionalData: context(owner, id, keyId) },
  );
  return new TextDecoder().decode(plain);
}
