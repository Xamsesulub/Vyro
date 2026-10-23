import { createURL } from "expo-linking";
import { supabase } from "../../lib/supabase";

export function authRedirectUrl() {
  return createURL("auth/callback", { scheme: "vyro" });
}

// Strict Mode and repeated link events must share a single code exchange.
const exchanges = new Map<string, ReturnType<typeof exchangeCode>>();
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
    return { recovery };
  } finally {
    listener.subscription.unsubscribe();
  }
}
export function completeAuthCode(code: string) {
  const existing = exchanges.get(code);
  if (existing) return existing;
  const exchange = exchangeCode(code).finally(() => exchanges.delete(code));
  exchanges.set(code, exchange);
  return exchange;
}

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
  })().finally(() => tokenExchanges.delete(accessToken));
  tokenExchanges.set(accessToken, exchange);
  return exchange;
}
