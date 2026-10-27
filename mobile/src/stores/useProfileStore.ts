import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "./useAuthStore";
import type { Profile } from "../features/social/api";

export const useProfileStore = create<{
  profile: Profile | null;
  loadedAt: number;
  errorFor: string | null;
}>(() => ({ profile: null, loadedAt: 0, errorFor: null }));

let revision = 0;
let readSequence = 0;
let appliedRead = 0;
const ownsSession = (userId: string) =>
  useAuthStore.getState().session?.user.id === userId;
export async function loadOwnProfile(
  userId: string,
  signal: AbortSignal,
  force = false,
): Promise<Profile | null> {
  if (!supabase || !ownsSession(userId) || signal.aborted) return null;
  const cached = useProfileStore.getState();
  if (
    !force &&
    cached.profile?.id === userId &&
    Date.now() - cached.loadedAt < 60_000
  )
    return cached.profile;
  // Reads from different screens may overlap. Cancelling one must not discard
  // another screen's result; edits and account changes still invalidate reads.
  const request = revision;
  const read = ++readSequence;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,display_name")
      .eq("id", userId)
      .abortSignal(signal)
      .single();
    if (error || !data || data.id !== userId)
      throw error ?? new Error("Profile unavailable");
    if (signal.aborted || !ownsSession(userId) || revision !== request)
      return null;
    if (read < appliedRead) return useProfileStore.getState().profile;
    appliedRead = read;
    useProfileStore.setState({
      profile: data,
      loadedAt: Date.now(),
      errorFor: null,
    });
    return data;
  } catch {
    if (
      !signal.aborted &&
      ownsSession(userId) &&
      revision === request &&
      read >= appliedRead
    )
      useProfileStore.setState({ errorFor: userId });
    return null;
  }
}

export async function saveDisplayName(userId: string, name: string) {
  const value = name.trim();
  if (value.length < 1 || value.length > 50)
    throw new Error("Bruk mellom 1 og 50 tegn.");
  if (!supabase || !ownsSession(userId))
    throw new Error("Logg inn på nytt for å endre navnet.");
  // Invalidate reads started before the edit. Database RLS enforces the owner too.
  const request = ++revision;
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: value })
    .eq("id", userId)
    .select("id,username,display_name")
    .single();
  if (error || !data)
    throw new Error(
      "Kunne ikke lagre navnet. Sjekk forbindelsen og prøv igjen.",
    );
  if (!ownsSession(userId))
    throw new Error("Kontoen ble byttet. Åpne profilen på nytt.");
  // A read started during the write also predates its commit.
  if (revision >= request) revision++;
  useProfileStore.setState({
    profile: data,
    loadedAt: Date.now(),
    errorFor: null,
  });
}

// No persistent cache: clear another account's profile immediately on account change.
useAuthStore.subscribe((next, previous) => {
  if (next.session?.user.id !== previous.session?.user.id) {
    revision++;
    useProfileStore.setState({ profile: null, loadedAt: 0, errorFor: null });
  }
});
