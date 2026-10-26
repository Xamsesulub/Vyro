import type { Session } from "@supabase/supabase-js";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Account from "../src/app/account";
import { router, useLocalSearchParams } from "expo-router";
import { openAuthSessionAsync, WebBrowserResultType } from "expo-web-browser";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/useAuthStore";
import { socialConfig } from "../src/features/auth/socialConfig";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  router: { replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));
jest.mock("expo-linking", () => ({ createURL: () => "vyro://auth/callback" }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "standalone" },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
  WebBrowserResultType: { CANCEL: "cancel" },
}));
jest.mock("../src/lib/supabase", () => ({
  supabaseConfigured: true,
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}));
jest.mock("../src/components/ui", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return {
    Screen: View,
    Txt: Text,
    Icon: () => null,
    useTheme: () => ({ text: "#111", muted: "#555", border: "#ddd" }),
    Button: ({
      title,
      onPress,
      disabled,
    }: {
      title: string;
      onPress: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        Pressable,
        {
          onPress,
          disabled,
          accessibilityRole: "button",
          accessibilityLabel: title,
          accessibilityState: { disabled },
        },
        React.createElement(Text, null, title),
      ),
  };
});
const auth = supabase!.auth;
beforeEach(() => {
  jest.clearAllMocks();
  socialConfig.google = true;
  socialConfig.apple = false;
  useAuthStore.setState({
    session: null,
    ready: true,
    confirmationEmail: null,
  });
  jest.mocked(auth.signInWithOAuth).mockResolvedValue({
    data: {
      provider: "google",
      url: "https://fixture.supabase.co/auth/v1/authorize?provider=google",
    },
    error: null,
  });
});

test.each(["register", "login"])(
  "Google %s needs no e-mail/password form and opens Home only after verified PKCE exchange",
  async (mode) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ mode });
    jest.mocked(openAuthSessionAsync).mockResolvedValue({
      type: "success",
      url: `vyro://auth/callback?code=${mode}-verified`,
    });
    const session = {
      access_token: "server-verified-test-token",
      user: {
        id: `${mode}-runner`,
        email: "runner@example.invalid",
        user_metadata: {},
      },
    } as Session;
    jest.mocked(auth.exchangeCodeForSession).mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    });
    await render(<Account />);
    expect(screen.getByLabelText("E-post").props.value).toBe("");
    expect(screen.getByLabelText("Passord").props.value).toBe("");
    if (mode === "register")
      expect(screen.getByLabelText("Visningsnavn").props.value).toBe("");
    await fireEvent.press(
      screen.getByRole("button", { name: "Fortsett med Google" }),
    );
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "vyro://auth/callback",
        skipBrowserRedirect: true,
      },
    });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith(
      `${mode}-verified`,
    );
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(useAuthStore.getState().session?.user.id).toBe(`${mode}-runner`);
    expect(router.replace).toHaveBeenCalledWith("/(tabs)");
  },
);

test("Google cancellation leaves registration open and repeat taps cannot open two browsers", async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ mode: "register" });
  let finish!: (value: { type: WebBrowserResultType.CANCEL }) => void;
  jest.mocked(openAuthSessionAsync).mockImplementationOnce(
    () =>
      new Promise((done) => {
        finish = done;
      }),
  );
  await render(<Account />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  );
  expect(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  ).toBeDisabled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  );
  expect(openAuthSessionAsync).toHaveBeenCalledTimes(1);
  await act(() => finish({ type: WebBrowserResultType.CANCEL }));
  expect(useAuthStore.getState().session).toBeNull();
  expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  ).toBeEnabled();
  expect(screen.getByLabelText("Visningsnavn")).toBeTruthy();
});
