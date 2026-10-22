import { AppState } from "react-native";
import { create } from "zustand";
import { supabase } from "../../lib/supabase";
import { appPersistence, useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { backupKey, backupPayload, mergeBackups, validBackup } from "./model";

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
      // Workouts are immutable. Conflict-ignore makes a lost response safe to retry.
      const pending = useAppStore
        .getState()
        .workouts.filter(
          (w) =>
            w.ownerId === owner &&
            w.source === "gps" &&
            !useAppStore.getState().backupReceipts[backupKey(owner, w.id)],
        );
      for (const workout of pending.slice(0, 40)) {
        if (!current()) return;
        const payload = backupPayload(workout, owner);
        const { error } = await client
          .from("workout_backups")
          .upsert(
            { owner_id: owner, local_id: workout.id, payload },
            { onConflict: "owner_id,local_id", ignoreDuplicates: true },
          )
          .abortSignal(abort.signal);
        if (!current()) return;
        if (error) throw error;
        useAppStore.setState((s) => ({
          backupReceipts: {
            ...s.backupReceipts,
            [backupKey(owner, workout.id)]: "saved",
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
          .from("workout_backups")
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
            .from("workout_backups")
            .select("local_id,payload")
            .eq("owner_id", owner)
            .in("local_id", missing.slice(offset, offset + 5))
            .abortSignal(abort.signal);
          if (!current()) return;
          if (readError) throw readError;
          const remote = (full ?? []).map((row) => {
            if (!validBackup(row.payload, owner, row.local_id))
              throw new Error(
                "En sikkerhetskopi kunne ikke leses. Ingen lokale økter er overskrevet.",
              );
            return backupPayload(row.payload, owner);
          });
          useAppStore.setState((s) => ({
            workouts: mergeBackups(s.workouts, remote, s.hiddenBackups),
            backupReceipts: {
              ...s.backupReceipts,
              ...Object.fromEntries(
                remote.map((w) => [backupKey(owner, w.id), "saved"]),
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
