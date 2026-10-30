import { randomUUID } from "expo-crypto";
import { workoutStorage } from "../../lib/workoutStorage";
import { client } from "../social/api";
import { requireOwner } from "../social/profiles";
import { normalizeRecoveryCode, openBackup, sealBackup } from "./cipher";

export type Vault = { key_id: string; verifier: string };
export type VaultKey = { keyId: string; code: string };
const localKey = (owner: string) => `vyro-backup-key-${owner}`;
const proof = "VYRO encrypted backup v1";
export async function remoteVault(owner: string): Promise<Vault | null> {
  requireOwner(owner);
  const { data, error } = await client()
    .from("backup_vaults")
    .select("key_id,verifier")
    .eq("owner_id", owner)
    .maybeSingle();
  if (error) throw error;
  requireOwner(owner);
  return data;
}
async function verify(owner: string, vault: Vault, code: string) {
  try {
    if (
      (await openBackup(vault.verifier, code, owner, "vault", vault.key_id)) !==
      proof
    )
      throw new Error();
  } catch {
    throw new Error(
      "Koden passer ikke til sikkerhetskopien. Ingen økter er endret.",
    );
  }
}
export async function unlockVault(owner: string, code: string) {
  const normalized = normalizeRecoveryCode(code);
  let vault = await remoteVault(owner);
  if (!vault) {
    const keyId = randomUUID();
    const verifier = await sealBackup(proof, normalized, owner, "vault", keyId);
    requireOwner(owner);
    const { error } = await client()
      .from("backup_vaults")
      .upsert(
        { owner_id: owner, key_id: keyId, verifier },
        { onConflict: "owner_id", ignoreDuplicates: true },
      );
    if (error) throw error;
    // Read back: a concurrent setup on another device must never be overwritten.
    vault = await remoteVault(owner);
  }
  if (!vault)
    throw new Error("Kunne ikke bekrefte sikkerhetskopien. Prøv igjen.");
  await verify(owner, vault, normalized);
  requireOwner(owner);
  const key = { keyId: vault.key_id, code: normalized };
  await workoutStorage.setItem(localKey(owner), JSON.stringify(key));
  requireOwner(owner);
  return key;
}
export async function vaultKey(owner: string): Promise<VaultKey> {
  const vault = await remoteVault(owner);
  const raw = await workoutStorage.getItem(localKey(owner));
  if (!vault || !raw)
    throw new Error(
      "Aktiver kryptert sikkerhetskopi eller skriv inn gjenopprettingskoden under Data og sikkerhetskopi.",
    );
  const key = JSON.parse(raw) as VaultKey;
  if (key.keyId !== vault.key_id)
    throw new Error("Skriv inn gjenopprettingskoden på denne enheten.");
  await verify(owner, vault, key.code);
  requireOwner(owner);
  return key;
}
export const forgetVaultKey = (owner: string) =>
  workoutStorage.removeItem(localKey(owner));
