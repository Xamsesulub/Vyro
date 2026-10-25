import { Platform } from "react-native";
import { openAuthSessionAsync } from "expo-web-browser";
import { supabase } from "../src/lib/supabase";
import { completeAuthCode } from "../src/features/auth/links";
import {
  completeSocialRedirect,
  signInWithBrowser,
} from "../src/features/auth/socialBrowser";
import { socialConfig } from "../src/features/auth/socialConfig";

jest.mock("../src/lib/supabase", () => ({
  supabase: { auth: { signInWithOAuth: jest.fn() } },
}));
jest.mock("../src/features/auth/links", () => ({
  authRedirectUrl: () => "vyro://auth/callback",
  completeAuthCode: jest.fn(),
}));
jest.mock("../src/features/auth/socialConfig", () => ({
  socialConfig: { google: true, apple: true },
}));
jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn() }));

const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "ios";
  socialConfig.google = true;
  (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
    data: {
      url: "https://project.supabase.co/auth/v1/authorize?provider=google",
    },
    error: null,
  });
  (completeAuthCode as jest.Mock).mockResolvedValue({ recovery: false });
});
afterEach(() => {
  Platform.OS = originalOS;
});

test("native Google signs in only after the PKCE callback is verified", async () => {
  (openAuthSessionAsync as jest.Mock).mockResolvedValue({
    type: "success",
    url: "vyro://auth/callback?code=one-time-code",
  });
  await expect(signInWithBrowser("google")).resolves.toBe("signed_in");
  expect(supabase!.auth.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: "vyro://auth/callback", skipBrowserRedirect: true },
  });
  expect(completeAuthCode).toHaveBeenCalledWith("one-time-code");
});

test.each(["cancel", "dismiss"])(
  "browser %s does not exchange a code",
  async (type) => {
    (openAuthSessionAsync as jest.Mock).mockResolvedValue({ type });
    await expect(signInWithBrowser("google")).resolves.toBe("cancelled");
    expect(completeAuthCode).not.toHaveBeenCalled();
  },
);

test.each([
  "https://attacker.example/auth/callback?code=stolen",
  "vyro://auth/other?code=stolen",
  "vyro://attacker@auth/callback?code=stolen",
  "vyro://auth/callback#access_token=unverified&refresh_token=unverified",
  "vyro://auth/callback?error=server_error&error_description=secret",
  "vyro://auth/callback",
])(
  "rejects an invalid callback without creating a session: %s",
  async (url) => {
    await expect(
      completeSocialRedirect(url, "vyro://auth/callback"),
    ).rejects.toBeDefined();
    expect(completeAuthCode).not.toHaveBeenCalled();
  },
);

test("denied consent stays signed out and a rejected code is not accepted", async () => {
  await expect(
    completeSocialRedirect(
      "vyro://auth/callback?error=access_denied",
      "vyro://auth/callback",
    ),
  ).resolves.toBe("cancelled");
  expect(completeAuthCode).not.toHaveBeenCalled();
  (completeAuthCode as jest.Mock).mockRejectedValue({
    code: "bad_code_verifier",
  });
  await expect(
    completeSocialRedirect(
      "vyro://auth/callback?code=unverified",
      "vyro://auth/callback",
    ),
  ).rejects.toMatchObject({ code: "bad_code_verifier" });
});

test("disabled providers never start an auth request", async () => {
  socialConfig.google = false;
  await expect(signInWithBrowser("google")).rejects.toMatchObject({
    code: "provider_disabled",
  });
  expect(supabase!.auth.signInWithOAuth).not.toHaveBeenCalled();
  expect(openAuthSessionAsync).not.toHaveBeenCalled();
});

test("a server error leaves the browser closed", async () => {
  (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
    data: { url: null },
    error: { code: "provider_disabled" },
  });
  await expect(signInWithBrowser("google")).rejects.toMatchObject({
    code: "provider_disabled",
  });
  expect(openAuthSessionAsync).not.toHaveBeenCalled();
});

test("web redirects in the current tab and waits for the callback page", async () => {
  Platform.OS = "web";
  await expect(signInWithBrowser("apple")).resolves.toBe("redirecting");
  expect(supabase!.auth.signInWithOAuth).toHaveBeenCalledWith({
    provider: "apple",
    options: { redirectTo: "vyro://auth/callback", skipBrowserRedirect: false },
  });
  expect(openAuthSessionAsync).not.toHaveBeenCalled();
  expect(completeAuthCode).not.toHaveBeenCalled();
});
