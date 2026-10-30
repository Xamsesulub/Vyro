import { AppState } from "react-native";
import { create } from "zustand";
import { supabase } from "../../lib/supabase";
import { appPersistence, useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import {
  backupKey,
  backupPayload,
  mergeBackups,
  sameBackup,
  validBackup,
} from "./model";
import { vaultKey } from "./vault";
import { openBackup, sealBackup } from "./cipher";

export const useBackupStatus = create<{
  owner?: string;
  busy: boolean;
  error: string | null;
  lastSynced?: number;
}>(() => ({ busy: false, error: null }));
let running:
  { owner: string; abort: AbortController; promise: Promise<void> } | undefined;
const eligible = (owner: string) =>
  useAuthStore.getState().ready &&
  useAuthStore.getState().session?.user.id === owner &&
  useAppStore.getState().ready &&
  useAppStore.getState().backupOwners.includes(owner);
export function cancelBackup() {
  running?.abort.abort();
}
function explain(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (["42P01", "PGRST205"].includes(e?.code ?? ""))
    return "Sikkerhetskopiering er ikke aktivert på serveren ennå. Øktene er beholdt på enheten.";
  if (e?.code === "P0001")
    return "Mange økter er sendt. Synkroniseringen fortsetter automatisk om litt.";
  return error instanceof Error && !/fetch|network|abort/i.test(error.message)
    ? error.message
    : "Kunne ikke synkronisere. Øktene er beholdt på enheten; prøver igjen når appen er åpen.";
}
export function syncBackup(owner: string): Promise<void> {
  if (!eligible(owner) || !supabase) return Promise.resolve();
  if (running) {
    if (running.owner === owner && !running.abort.signal.aborted)
      return running.promise;
    running.abort.abort();
    return running.promise.then(() => syncBackup(owner));
  }
  const client = supabase;
  const abort = new AbortController();
  const current = () => !abort.signal.aborted && eligible(owner);
  const task = { owner, abort, promise: Promise.resolve() };
  running = task;
  useBackupStatus.setState({ owner, busy: true, error: null });
  task.promise = (async () => {
    try {
      const key = await vaultKey(owner);
      if (!current()) return;
      const receipt = `encrypted:${key.keyId}`;
      const decrypt = async (row: {
        local_id: string;
        key_id: string;
        ciphertext: string;
      }) => {
        if (row.key_id !== key.keyId)
          throw new Error(
            "Sikkerhetskopien bruker en annen gjenopprettingskode.",
          );
        const payload: unknown = JSON.parse(
          await openBackup(
            row.ciphertext,
            key.code,
            owner,
            row.local_id,
            key.keyId,
          ),
        );
        if (!validBackup(payload, owner, row.local_id))
          throw new Error(
            "Sikkerhetskopien kunne ikke verifiseres. Lokale økter er beholdt.",
          );
        return backupPayload(payload, owner);
      };
      const upload = async (payload: ReturnType<typeof backupPayload>) => {
        const ciphertext = await sealBackup(
          JSON.stringify(payload),
          key.code,
          owner,
          payload.id,
          key.keyId,
        );
        if (!current()) return false;
        const { error } = await client
          .from("encrypted_workout_backups")
          .upsert(
            {
              owner_id: owner,
              local_id: payload.id,
              key_id: key.keyId,
              ciphertext,
            },
            { onConflict: "owner_id,local_id", ignoreDuplicates: true },
          )
          .abortSignal(abort.signal);
        if (!current()) return false;
        if (error) throw error;
        const read = await client
          .from("encrypted_workout_backups")
          .select("local_id,key_id,ciphertext")
          .eq("owner_id", owner)
          .eq("local_id", payload.id)
          .abortSignal(abort.signal)
          .single();
        if (!current()) return false;
        if (read.error) throw read.error;
        if (!sameBackup(await decrypt(read.data), payload))
          throw new Error(
            "Kopiene av denne økten er ulike. Begge er beholdt; ingen data er overskrevet.",
          );
        return current();
      };
      // Migrate remote-only legacy rows too. Never remove plaintext before a
      // read-back, authenticated decryption and exact payload comparison.
      const legacy = await client
        .from("workout_backups")
        .select("local_id,payload")
        .eq("owner_id", owner)
        .order("local_id")
        .limit(20)
        .abortSignal(abort.signal);
      if (!current()) return;
      if (legacy.error) throw legacy.error;
      for (const row of legacy.data ?? []) {
        if (!validBackup(row.payload, owner, row.local_id))
          throw new Error(
            "En eldre sikkerhetskopi kunne ikke leses. Den er beholdt.",
          );
        if (!(await upload(backupPayload(row.payload, owner)))) return;
        const removed = await client
          .from("workout_backups")
          .delete()
          .eq("owner_id", owner)
          .eq("local_id", row.local_id)
          .abortSignal(abort.signal);
        if (!current()) return;
        if (removed.error) throw removed.error;
      }
      // Workouts are immutable. Conflict-ignore makes a lost response safe to retry.
      const pending = useAppStore
        .getState()
        .workouts.filter(
          (w) =>
            w.ownerId === owner &&
            (w.source === "gps" || w.source === "timer") &&
            useAppStore.getState().backupReceipts[backupKey(owner, w.id)] !==
              receipt,
        );
      for (const workout of pending.slice(0, 40)) {
        if (!current()) return;
        const payload = backupPayload(workout, owner);
        if (!(await upload(payload))) return;
        useAppStore.setState((s) => ({
          backupReceipts: {
            ...s.backupReceipts,
            [backupKey(owner, workout.id)]: receipt,
          },
        }));
      }
      // Page only IDs for discovery, then fetch five missing payloads at a time.
      // Re-scan the small manifest on each sync: concurrent commits cannot fall
      // behind a timestamp/sequence watermark and disappear on another device.
      let cursor = "";
      for (;;) {
        if (!current()) return;
        const { data, error } = await client
          .from("encrypted_workout_backups")
          .select("local_id")
          .eq("owner_id", owner)
          .gt("local_id", cursor)
          .order("local_id", { ascending: true })
          .limit(200)
          .abortSignal(abort.signal);
        if (!current()) return;
        if (error) throw error;
        const rows = data ?? [];
        if (!rows.length) break;
        const state = useAppStore.getState();
        const present = new Set(
          state.workouts.filter((w) => w.ownerId === owner).map((w) => w.id),
        );
        const hidden = new Set(state.hiddenBackups);
        const missing = rows
          .map((row) => row.local_id as string)
          .filter(
            (id) => !present.has(id) && !hidden.has(backupKey(owner, id)),
          );
        for (let offset = 0; offset < missing.length; offset += 5) {
          if (!current()) return;
          const { data: full, error: readError } = await client
            .from("encrypted_workout_backups")
            .select("local_id,key_id,ciphertext")
            .eq("owner_id", owner)
            .in("local_id", missing.slice(offset, offset + 5))
            .abortSignal(abort.signal);
          if (!current()) return;
          if (readError) throw readError;
          const remote = await Promise.all((full ?? []).map(decrypt));
          if (!current()) return;
          useAppStore.setState((s) => ({
            workouts: mergeBackups(s.workouts, remote, s.hiddenBackups),
            backupReceipts: {
              ...s.backupReceipts,
              ...Object.fromEntries(
                remote.map((w) => [backupKey(owner, w.id), receipt]),
              ),
            },
          }));
        }
        cursor = rows[rows.length - 1].local_id;
        if (rows.length < 200) break;
      }
      await appPersistence.flush();
      if (current())
        useBackupStatus.setState({ lastSynced: Date.now(), error: null });
    } catch (error) {
      if (current()) useBackupStatus.setState({ error: explain(error) });
    } finally {
      if (running === task) running = undefined;
      if (useBackupStatus.getState().owner === owner)
        useBackupStatus.setState({ busy: false });
    }
  })();
  return task.promise;
}
export async function restoreBackup(owner: string) {
  if (!eligible(owner)) return;
  cancelBackup();
  await running?.promise;
  if (!eligible(owner)) return;
  useAppStore.setState((s) => ({
    hiddenBackups: s.hiddenBackups.filter(
      (key) => !key.startsWith(`${owner}:`),
    ),
  }));
  await syncBackup(owner);
}
export async function deleteBackups(owner: string) {
  if (useAuthStore.getState().session?.user.id !== owner || !supabase) return;
  useAppStore.setState((s) => ({
    backupOwners: s.backupOwners.filter((id) => id !== owner),
  }));
  cancelBackup();
  await running?.promise;
  if (useAuthStore.getState().session?.user.id !== owner) return;
  useBackupStatus.setState({ owner, busy: true, error: null });
  try {
    const { error } = await supabase
      .from("workout_backups")
      .delete()
      .eq("owner_id", owner);
    if (error) throw error;
    if (useAuthStore.getState().session?.user.id !== owner) return;
    const encrypted = await supabase
      .from("encrypted_workout_backups")
      .delete()
      .eq("owner_id", owner);
    if (encrypted.error) throw encrypted.error;
    if (useAuthStore.getState().session?.user.id !== owner) return;
    useAppStore.setState((s) => ({
      backupReceipts: Object.fromEntries(
        Object.entries(s.backupReceipts).filter(
          ([key]) => !key.startsWith(`${owner}:`),
        ),
      ),
    }));
    useBackupStatus.setState({ lastSynced: undefined });
  } catch (error) {
    if (useAuthStore.getState().session?.user.id === owner)
      useBackupStatus.setState({ error: explain(error) });
  } finally {
    if (useBackupStatus.getState().owner === owner)
      useBackupStatus.setState({ busy: false });
  }
}
export function observeBackups() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    const owner = useAuthStore.getState().session?.user.id;
    if (!owner || !eligible(owner) || AppState.currentState === "background") {
      cancelBackup();
      return;
    }
    timer = setTimeout(async () => {
      await syncBackup(owner);
    }, 1500);
  };
  const stopApp = useAppStore.subscribe((s, p) => {
    if (
      s.ready !== p.ready ||
      s.backupOwners !== p.backupOwners ||
      s.workouts !== p.workouts
    )
      schedule();
  });
  const stopAuth = useAuthStore.subscribe((s, p) => {
    if (s.ready !== p.ready || s.session?.user.id !== p.session?.user.id) {
      cancelBackup();
      schedule();
    }
  });
  const app = AppState.addEventListener("change", schedule);
  const retry = setInterval(schedule, 60_000);
  schedule();
  return () => {
    clearInterval(retry);
    clearTimeout(timer);
    cancelBackup();
    stopApp();
    stopAuth();
    app.remove();
  };
}
