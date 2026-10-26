import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { SocialSignIn } from "../src/components/SocialSignIn";
import { appleSignInAvailable } from "../src/features/auth/apple";
import { socialConfig } from "../src/features/auth/socialConfig";

jest.mock("../src/lib/supabase", () => ({ supabaseConfigured: true }));
jest.mock("../src/features/auth/apple", () => ({
  appleSignInAvailable: jest.fn(),
}));
jest.mock("../src/components/AppleSignInButton", () => ({
  AppleSignInButton: ({
    disabled,
    onPress,
  }: {
    disabled: boolean;
    onPress: () => void;
  }) => {
    const React = require("react");
    const { Pressable, Text } = require("react-native");
    return React.createElement(
      Pressable,
      {
        disabled,
        onPress,
        accessibilityRole: "button",
        accessibilityLabel: "Fortsett med Apple",
        accessibilityState: { disabled },
      },
      React.createElement(Text, null, "Fortsett med Apple"),
    );
  },
}));
jest.mock("../src/components/ui", () => ({
  Txt: require("react-native").Text,
}));
const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  require("../src/features/auth/socialConfig").googleNeedsOwnBuild = false;
  Platform.OS = "ios";
  socialConfig.google = true;
  socialConfig.apple = true;
  (appleSignInAvailable as jest.Mock).mockResolvedValue(true);
});
afterEach(() => {
  Platform.OS = originalOS;
});

test("shows equally available Apple and Google actions and disables both during sign-in", async () => {
  const onPress = jest.fn();
  await render(<SocialSignIn disabled={false} onPress={onPress} />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Fortsett med Apple" }),
  );
  expect(onPress.mock.calls).toEqual([["google"], ["apple"]]);
  await screen.rerender(<SocialSignIn disabled onPress={onPress} />);
  expect(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Fortsett med Apple" }),
  ).toBeDisabled();
});

test("unconfigured providers do not show dead buttons", async () => {
  socialConfig.google = false;
  socialConfig.apple = false;
  await render(<SocialSignIn disabled={false} onPress={jest.fn()} />);
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(appleSignInAvailable).not.toHaveBeenCalled();
});

test("Google is usable on iPhone while Apple availability is pending or unavailable", async () => {
  let finish!: (value: boolean) => void;
  (appleSignInAvailable as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render(<SocialSignIn disabled={false} onPress={jest.fn()} />);
  expect(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Fortsett med Apple" }),
  ).toBeNull();
  await act(() => finish(false));
  expect(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Fortsett med Apple" }),
  ).toBeNull();
});

test("Google works independently when Apple has not been configured", async () => {
  socialConfig.apple = false;
  const onPress = jest.fn();
  await render(<SocialSignIn disabled={false} onPress={onPress} />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Fortsett med Google" }),
  );
  expect(onPress).toHaveBeenCalledWith("google");
  expect(appleSignInAvailable).not.toHaveBeenCalled();
  expect(screen.getByText(/Kontoen opprettes/)).toBeTruthy();
});

test("Expo Go explains the platform limitation without offering a broken OAuth button", async () => {
  socialConfig.google = false;
  socialConfig.apple = false;
  require("../src/features/auth/socialConfig").googleNeedsOwnBuild = true;
  await render(<SocialSignIn disabled={false} onPress={jest.fn()} />);
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(
    screen.getByText(/Expo Go støtter ikke denne innloggingen/),
  ).toBeTruthy();
});
