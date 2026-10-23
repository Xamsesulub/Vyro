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

// Only call with sessions returned by Supabase, never with local profile data.
export function acceptAuthSession(session: Session | null) {
  useAuthStore.setState({
    session,
    ready: true,
    initializationSlow: false,
    ...(session ? { confirmationEmail: null } : {}),
  });
}

export function observeAuth() {
  if (!supabase) return;
  let active = true;
  // Allow the user to reach sign-in even if persisted-session recovery stalls.
  // This never grants access: private screens still require a real session.
  const timer = setTimeout(() => {
    if (active && !useAuthStore.getState().ready)
      useAuthStore.setState({ ready: true, initializationSlow: true });
  }, 8_000);
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (!active) return;
    clearTimeout(timer);
    // Keep the subscriber synchronous; do not trigger a nested token refresh.
    acceptAuthSession(session);
    if (event === "SIGNED_OUT")
      useAuthStore.setState({ confirmationEmail: null });
  });
  return () => {
    active = false;
    clearTimeout(timer);
    data.subscription.unsubscribe();
  };
}
