import { client } from "../social/api";
import { requireOwner } from "../social/profiles";
import { appPersistence, useAppStore } from "../../stores/useAppStore";
import { useRouteLibrary } from "../../stores/useRouteLibrary";
import { acceptAuthSession, useAuthStore } from "../../stores/useAuthStore";
import { useSocialStore } from "../../stores/useSocialStore";
import { workoutStorage } from "../../lib/workoutStorage";
import { cancelBackup } from "../backup/sync";
import { forgetVaultKey } from "../backup/vault";

export async function deleteOwnAccount(owner: string) {
  requireOwner(owner);
  if (useAppStore.getState().recording.status !== "idle")
    throw new Error("Avslutt eller forkast økten før du sletter kontoen.");
  cancelBackup();
  const result = await client().functions.invoke("delete-account", {
    body: { confirmation: "SLETT" },
  });
  if (result.error) {
    let code: string | undefined;
    try {
      code = (await result.error.context?.json())?.code;
    } catch {
      /* No readable response. */
    }
    if (code === "recent_login" || code === "signin")
      throw new Error(
        "Logg ut og inn igjen, og bekreft slettingen innen 15 minutter.",
      );
    throw new Error(
      "Slettingen ble ikke bekreftet. Prøv igjen for å fortsette oppryddingen. Kontoen kan være låst for nye endringer mens slettingen pågår.",
    );
  }
  if (result.data?.code !== "deleted")
    throw new Error("Slettingen kunne ikke bekreftes. Prøv igjen.");
  // Clear only this owner's records, even if another account signed in meanwhile.
  useAppStore.setState((s) => ({
    workouts: s.workouts.filter((w) => w.ownerId !== owner),
    backupOwners: s.backupOwners.filter((id) => id !== owner),
    watchOwners: s.watchOwners.filter((id) => id !== owner),
    watchReceipts: s.watchReceipts.filter((id) => !id.startsWith(`${owner}:`)),
    hiddenBackups: s.hiddenBackups.filter((id) => !id.startsWith(`${owner}:`)),
    backupReceipts: Object.fromEntries(
      Object.entries(s.backupReceipts).filter(
        ([id]) => !id.startsWith(`${owner}:`),
      ),
    ),
    sharingAudienceByOwner: Object.fromEntries(
      Object.entries(s.sharingAudienceByOwner).filter(([id]) => id !== owner),
    ),
  }));
  useRouteLibrary.setState((s) => ({
    entries: s.entries.filter((e) => e.ownerId !== owner),
  }));
  const removed = new Set(
    useSocialStore
      .getState()
      .posts.filter((p) => p.workout.ownerId === owner)
      .map((p) => p.id),
  );
  useSocialStore.setState((s) => ({
    posts: s.posts.filter((p) => !removed.has(p.id)),
    comments: s.comments.filter((c) => !removed.has(c.postId)),
    likes: s.likes.filter((id) => !removed.has(id)),
    reposts: s.reposts.filter((id) => !removed.has(id)),
  }));
  let localCleanupComplete = true;
  try {
    await appPersistence.flush();
    if (useAppStore.getState().storageError)
      throw new Error("Local write failed");
    // Reads drain the encrypted storage write queue, including cache writes.
    for (const [name, field] of [
      ["vyro-route-library-v1", "entries"],
      ["vyro-social-preview-v1", "posts"],
    ]) {
      const raw = await workoutStorage.getItem(name);
      const rows = raw ? JSON.parse(raw).state[field] : [];
      if (
        rows?.some(
          (r: { ownerId?: string; workout?: { ownerId?: string } }) =>
            r.ownerId === owner || r.workout?.ownerId === owner,
        )
      )
        throw new Error("Local cache retained");
    }
    await forgetVaultKey(owner);
  } catch {
    localCleanupComplete = false;
  }
  // Cloud deletion has completed even if local storage fails. Do not report that
  // the account still exists or accidentally sign out a newer, different account.
  if (useAuthStore.getState().session?.user.id === owner) {
    try {
      const result = await client().auth.signOut({ scope: "local" });
      if (result.error) localCleanupComplete = false;
    } catch {
      localCleanupComplete = false;
    }
    if (useAuthStore.getState().session?.user.id === owner)
      acceptAuthSession(null);
  }
  return { localCleanupComplete };
}
