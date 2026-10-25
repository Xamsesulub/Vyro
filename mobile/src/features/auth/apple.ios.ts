import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "../../lib/supabase";
import { acceptAuthSession } from "../../stores/useAuthStore";
import { socialConfig } from "./socialConfig";
import type { SocialResult } from "./socialBrowser";

export const appleSignInAvailable = AppleAuthentication.isAvailableAsync;

export async function signInWithApple(): Promise<SocialResult> {
  if (!supabase || !socialConfig.apple) throw { code: "provider_disabled" };
  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
  } catch (error) {
    if ((error as { code?: string })?.code === "ERR_REQUEST_CANCELED")
      return "cancelled";
    throw error;
  }
  if (!credential.identityToken)
    throw new Error("Missing Apple identity token");
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce,
  });
  if (error) throw error;
  if (!data.session) throw new Error("Missing verified Apple session");
  // Supabase verifies Apple's signature, audience and nonce. Never trust the
  // native credential alone. Names remain user-chosen in VYRO's profile/account.
  acceptAuthSession(data.session);
  return "signed_in";
}
