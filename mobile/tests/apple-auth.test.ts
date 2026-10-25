import type { Session } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/useAuthStore";
import { signInWithApple } from "../src/features/auth/apple.ios";
import { socialConfig } from "../src/features/auth/socialConfig";

jest.mock("../src/lib/supabase", () => ({
  supabase: { auth: { signInWithIdToken: jest.fn() } },
}));
jest.mock("../src/features/auth/socialConfig", () => ({
  socialConfig: { apple: true },
}));
jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { EMAIL: 1 },
}));
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(),
  digestStringAsync: jest.fn(async (_: string, value: string) =>
    require("node:crypto").createHash("sha256").update(value).digest("hex"),
  ),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));
beforeEach(() => {
  jest.clearAllMocks();
  socialConfig.apple = true;
  useAuthStore.setState({ session: null, ready: true });
  (Crypto.randomUUID as jest.Mock).mockReturnValue(
    "random-nonce-for-this-attempt",
  );
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
    identityToken: "apple-signed-token",
  });
});

test("uses a fresh hashed nonce for Apple and trusts only the server-verified session", async () => {
  let finish!: (value: unknown) => void;
  (supabase!.auth.signInWithIdToken as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const result = signInWithApple();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(useAuthStore.getState().session).toBeNull();
  const hash = require("node:crypto")
    .createHash("sha256")
    .update("random-nonce-for-this-attempt")
    .digest("hex");
  expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hash,
  });
  expect(supabase!.auth.signInWithIdToken).toHaveBeenCalledWith({
    provider: "apple",
    token: "apple-signed-token",
    nonce: "random-nonce-for-this-attempt",
  });
  const session = {
    user: { id: "apple-runner", email: "private@privaterelay.appleid.com" },
  } as Session;
  finish({ data: { session }, error: null });
  await expect(result).resolves.toBe("signed_in");
  expect(useAuthStore.getState().session).toBe(session);
});

test("cancelling Apple's sheet does not sign in or call Supabase", async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue({
    code: "ERR_REQUEST_CANCELED",
  });
  await expect(signInWithApple()).resolves.toBe("cancelled");
  expect(supabase!.auth.signInWithIdToken).not.toHaveBeenCalled();
  expect(useAuthStore.getState().session).toBeNull();
});

test("missing tokens and server-rejected tokens leave the account signed out", async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
    identityToken: null,
  });
  await expect(signInWithApple()).rejects.toThrow();
  expect(supabase!.auth.signInWithIdToken).not.toHaveBeenCalled();
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
    identityToken: "invalid",
  });
  (supabase!.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: { code: "bad_id_token" },
  });
  await expect(signInWithApple()).rejects.toMatchObject({
    code: "bad_id_token",
  });
  expect(useAuthStore.getState().session).toBeNull();
});

test("provider remains unavailable until account setup is enabled", async () => {
  socialConfig.apple = false;
  await expect(signInWithApple()).rejects.toMatchObject({
    code: "provider_disabled",
  });
  expect(AppleAuthentication.signInAsync).not.toHaveBeenCalled();
});
