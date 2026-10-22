import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export const useAuthStore = create<{
  session: Session | null;
  ready: boolean;
  initializationSlow: boolean;
  confirmationEmail: string | null;
}>()(() => ({
  session: null,
  ready: !supabase,
  initializationSlow: false,
  confirmationEmail: null,
}));

let sessionRevision = 0;
let recovery: Promise<void> | undefined;

// Only call with sessions returned by Supabase, never with local profile data.
export function acceptAuthSession(session: Session | null) {
  sessionRevision++;
  useAuthStore.setState({
    session,
    ready: true,
    initializationSlow: false,
    ...(session ? { confirmationEmail: null } : {}),
  });
}

// Share retries across screens, and never let a late read undo a newer login/logout.
export function retryAuthInitialization(): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (recovery) return recovery;
  const revision = sessionRevision;
  recovery = supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (revision !== sessionRevision) return;
      if (error) throw error;
      acceptAuthSession(data.session);
    })
    .catch(() => {
      if (revision === sessionRevision)
        useAuthStore.setState({ initializationSlow: true });
    })
    .finally(() => {
      recovery = undefined;
    });
  return recovery;
}

export function observeAuth() {
  if (!supabase) return;
  let active = true;
  const initialRevision = sessionRevision;
  let verifyInitial: ReturnType<typeof setTimeout> | undefined;
  // A slow read is not evidence that the user is signed out.
  const timer = setTimeout(() => {
    if (active && !useAuthStore.getState().ready)
      useAuthStore.setState({ initializationSlow: true });
  }, 8_000);
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (!active) return;
    // INITIAL_SESSION can arrive after sign-in, token refresh or sign-out.
    if (event === "INITIAL_SESSION" && sessionRevision !== initialRevision)
      return;
    if (event === "INITIAL_SESSION" && !session) {
      // The SDK also emits an empty initial snapshot when recovery fails.
      // Confirm it outside the SDK callback/lock before showing the guest page.
      verifyInitial = setTimeout(() => {
        if (active && sessionRevision === initialRevision)
          void retryAuthInitialization();
      }, 0);
      return;
    }
    clearTimeout(timer);
    // Keep the subscriber synchronous; do not trigger a nested token refresh.
    acceptAuthSession(session);
    if (event === "SIGNED_OUT")
      useAuthStore.setState({ confirmationEmail: null });
  });
  return () => {
    active = false;
    clearTimeout(timer);
    clearTimeout(verifyInitial);
    data.subscription.unsubscribe();
  };
}
