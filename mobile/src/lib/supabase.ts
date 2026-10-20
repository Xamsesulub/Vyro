import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
export const supabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) &&
  key.startsWith("sb_publishable_");
const isServer = Platform.OS === "web" && typeof window === "undefined";

// A publishable client only. Access to user data must be enforced by database RLS.
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
        persistSession: !isServer,
        autoRefreshToken: !isServer,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

export function manageSupabaseSession() {
  if (!supabase || Platform.OS === "web") return;
  const client = supabase;
  const update = (state: string) => {
    if (state === "active") client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  };
  update(AppState.currentState ?? "unknown");
  const subscription = AppState.addEventListener("change", update);
  return () => {
    subscription.remove();
    client.auth.stopAutoRefresh();
  };
}
