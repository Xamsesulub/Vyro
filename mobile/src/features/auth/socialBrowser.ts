import { Platform } from "react-native";
import { supabase } from "../../lib/supabase";
import { authRedirectUrl, completeAuthCode } from "./links";
import { socialConfig, type SocialProvider } from "./socialConfig";

export type SocialResult = "signed_in" | "cancelled" | "redirecting";

export async function completeSocialRedirect(
  url: string,
  redirectTo: string,
): Promise<SocialResult> {
  const actual = new URL(url);
  const expected = new URL(redirectTo);
  if (
    actual.protocol !== expected.protocol ||
    actual.host !== expected.host ||
    actual.pathname !== expected.pathname ||
    actual.username ||
    actual.password ||
    actual.hash
  )
    throw new Error("Unexpected OAuth redirect");
  if (actual.searchParams.get("error") === "access_denied") return "cancelled";
  if (actual.searchParams.has("error") || actual.searchParams.has("error_code"))
    throw { code: "oauth_failed" };
  const code = actual.searchParams.get("code");
  if (!code) throw new Error("Missing OAuth code");
  // The server verifies the code and stored PKCE verifier; URL data is not a session.
  await completeAuthCode(code);
  return "signed_in";
}

export async function signInWithBrowser(
  provider: SocialProvider,
): Promise<SocialResult> {
  if (!supabase || !socialConfig[provider]) throw { code: "provider_disabled" };
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // On web use a same-tab redirect: mobile browsers can block async popups.
      skipBrowserRedirect: Platform.OS !== "web",
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Missing OAuth authorization URL");
  if (Platform.OS === "web") return "redirecting";
  // Load only when starting native OAuth; older installed builds can still use
  // e-mail while these providers are disabled and the new module is absent.
  const { openAuthSessionAsync } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Optional native module must not load until a supported login starts.
    require("expo-web-browser") as typeof import("expo-web-browser");
  const result = await openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "cancel" || result.type === "dismiss") return "cancelled";
  if (result.type !== "success")
    throw new Error("OAuth browser did not finish");
  return completeSocialRedirect(result.url, redirectTo);
}
