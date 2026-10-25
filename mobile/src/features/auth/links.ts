import { createURL } from "expo-linking";
import { supabase } from "../../lib/supabase";
import { acceptAuthSession, useAuthStore } from "../../stores/useAuthStore";

export function authRedirectUrl() {
  return createURL("auth/callback", { scheme: "vyro" });
}

// Strict Mode and repeated link events must share a single code exchange.
const exchanges = new Map<string, ReturnType<typeof exchangeCode>>();
// A browser result and Expo Router can deliver the same callback sequentially.
// Keep only the last successful result briefly, and never restore its session.
let completed:
  | {
      code: string;
      userId: string;
      until: number;
      result: { recovery: boolean };
    }
  | undefined;
async function exchangeCode(code: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  let recovery = false;
  const { data: listener } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") recovery = true;
  });
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data.session) throw new Error("Missing session after code exchange");
    acceptAuthSession(data.session);
    return { recovery };
  } finally {
    listener.subscription.unsubscribe();
  }
}
export function completeAuthCode(code: string) {
  if (
    completed?.code === code &&
    completed.until > Date.now() &&
    completed.userId === useAuthStore.getState().session?.user.id
  )
    return Promise.resolve(completed.result);
  const existing = exchanges.get(code);
  if (existing) return existing;
  const exchange = exchangeCode(code)
    .then((result) => {
      const userId = useAuthStore.getState().session?.user.id;
      if (userId)
        completed = { code, userId, until: Date.now() + 60_000, result };
      return result;
    })
    .finally(() => exchanges.delete(code));
  exchanges.set(code, exchange);
  return exchange;
}

useAuthStore.subscribe((next, previous) => {
  if (next.session?.user.id !== previous.session?.user.id)
    completed = undefined;
});

/** Older confirmation/resend links can still use a token fragment. */
export function authFragment(url: string | null) {
  const params = new URLSearchParams(url?.split("#")[1] ?? "");
  return {
    accessToken: params.get("access_token") ?? "",
    refreshToken: params.get("refresh_token") ?? "",
    type: params.get("type") ?? "",
    errorCode: params.get("error_code") ?? "",
    hasError: params.has("error"),
  };
}

const tokenExchanges = new Map<string, Promise<void>>();
export function completeTokenLink(accessToken: string, refreshToken: string) {
  const existing = tokenExchanges.get(accessToken);
  if (existing) return existing;
  const exchange = (async () => {
    if (!supabase || !accessToken || !refreshToken)
      throw new Error("Invalid auth link");
    // setSession validates the supplied session with Auth. Never trust URL claims.
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    if (!data.session) throw new Error("Missing session");
    acceptAuthSession(data.session);
  })().finally(() => tokenExchanges.delete(accessToken));
  tokenExchanges.set(accessToken, exchange);
  return exchange;
}
