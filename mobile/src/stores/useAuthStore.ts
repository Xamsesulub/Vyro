import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export const useAuthStore = create<{
  session: Session | null;
  ready: boolean;
}>()(() => ({ session: null, ready: !supabase }));

export function observeAuth() {
  if (!supabase) return;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // Never call another auth method inside this callback (the auth lock is held).
    useAuthStore.setState({ session, ready: true });
  });
  return () => data.subscription.unsubscribe();
}
