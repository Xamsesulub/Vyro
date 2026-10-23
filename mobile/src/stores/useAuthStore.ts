import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export const useAuthStore = create<{
  session: Session | null;
  ready: boolean;
  initializationSlow: boolean;
}>()(() => ({ session: null, ready: !supabase, initializationSlow: false }));

export function observeAuth() {
  if (!supabase) return;
  // Allow the user to reach sign-in even if persisted-session recovery stalls.
  // This never grants access: private screens still require a real session.
  const timer = setTimeout(() => {
    if (!useAuthStore.getState().ready)
      useAuthStore.setState({ ready: true, initializationSlow: true });
  }, 8_000);
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    clearTimeout(timer);
    // Keep the subscriber synchronous; do not trigger a nested token refresh.
    useAuthStore.setState({ session, ready: true, initializationSlow: false });
  });
  return () => {
    clearTimeout(timer);
    data.subscription.unsubscribe();
  };
}
