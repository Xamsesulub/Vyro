import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { View, Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import Profile from "../src/app/(tabs)/profile";
import Settings from "../src/app/settings";
import { AccountGate } from "../src/components/AccountGate";
import { observeAuth, useAuthStore } from "../src/stores/useAuthStore";
import { supabase } from "../src/lib/supabase";
import Home from "../src/app/(tabs)/index";
import { acceptAuthSession } from "../src/stores/useAuthStore";

jest.mock("expo-router", () => ({
  router: { prefetch: jest.fn(), push: jest.fn() },
  useFocusEffect: (callback: () => void) =>
    jest.requireActual("react").useEffect(callback, [callback]),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
}));
jest.mock("../src/features/social/feed", () => ({
  loadFeed: jest.fn(async () => ({ posts: [], next: null })),
}));
jest.mock("../src/components/CloudPost", () => ({ CloudPost: () => null }));
jest.mock("../src/components/TurfEvents", () => ({ TurfEvents: () => null }));
jest.mock("../src/lib/supabase", () => ({
  supabase: { auth: { onAuthStateChange: jest.fn() } },
}));
jest.mock("../src/stores/useAppStore", () => {
  const state = {
    name: "Lokalt navn",
    examplesVisible: false,
    goal: 20,
    theme: "light",
    preferences: jest.fn(),
    workouts: [],
    storageError: null,
  };
  return {
    useAppStore: (selector?: (value: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});
jest.mock("../src/features/activities/useVisibleWorkouts", () => ({
  useVisibleWorkouts: () => [],
}));
jest.mock("../src/components/ActivityCard", () => ({
  ActivityCard: () => null,
}));
jest.mock("../src/components/motion", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => children,
  MovementLine: () => null,
  ProgressLine: () => null,
}));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { View, Text, Pressable } = jest.requireActual("react-native");
  return {
    Screen: View,
    Txt: Text,
    Icon: () => null,
    Logo: () => null,
    Chip: () => null,
    styles: { row: {} },
    useTheme: () => ({ border: "#ddd", text: "#111", muted: "#555" }),
    Button: ({ title, disabled }: { title: string; disabled?: boolean }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: title,
          accessibilityState: { disabled },
        },
        React.createElement(Text, null, title),
      ),
  };
});

function Screens() {
  return (
    <View>
      <AccountGate>
        <Text>Privat innhold</Text>
      </AccountGate>
      <Profile />
      <Settings />
      <Home />
    </View>
  );
}

test("recovered login, token refresh and logout update home, profile and settings together", async () => {
  let event!: (event: AuthChangeEvent, session: Session | null) => void;
  (supabase!.auth.onAuthStateChange as jest.Mock).mockImplementation(
    (listener) => {
      event = listener;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    },
  );
  useAuthStore.setState({
    ready: false,
    session: null,
    confirmationEmail: null,
  });
  const stop = observeAuth();
  await render(<Screens />);
  expect(screen.queryByText("Gjest · ikke innlogget")).toBeNull();
  const session = {
    user: { id: "runner", user_metadata: { display_name: "Kontonavn" } },
  } as unknown as Session;
  await act(() => event("INITIAL_SESSION", session));
  expect(screen.getByText("Privat innhold")).toBeTruthy();
  expect(screen.getByText("Innlogget")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Konto og utlogging" }),
  ).toBeTruthy();
  expect(screen.queryByText(/Logg inn/)).toBeNull();
  expect(screen.getByText("Turer å dele.")).toBeTruthy();
  await screen.unmount();
  await render(<Screens />);
  expect(screen.getByText("Kontonavn")).toBeTruthy();
  await act(() =>
    event("TOKEN_REFRESHED", {
      ...session,
      access_token: "refreshed-test-token",
    }),
  );
  expect(screen.getByText("Privat innhold")).toBeTruthy();
  await act(() => event("SIGNED_OUT", null));
  expect(screen.queryByText("Privat innhold")).toBeNull();
  expect(screen.getByText("Gjest · ikke innlogget")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Konto og utlogging" }),
  ).toBeNull();
  stop?.();
});

test("a local name and pending confirmation never unlock private screens", async () => {
  useAuthStore.setState({
    ready: true,
    session: null,
    confirmationEmail: "runner@example.com",
  });
  await render(<Screens />);
  expect(screen.getByText("Lokalt navn")).toBeTruthy();
  expect(
    screen.getByText("Venter på e-postbekreftelse · ikke innlogget"),
  ).toBeTruthy();
  expect(screen.queryByText("Privat innhold")).toBeNull();
  expect(
    screen.getAllByRole("button", { name: "Bekreft e-post eller logg inn" })
      .length,
  ).toBeTruthy();
});

test("Home never flashes the sign-in page during slow recovery or a stale initial auth event", async () => {
  jest.useFakeTimers();
  let event!: (event: AuthChangeEvent, session: Session | null) => void;
  (supabase!.auth.onAuthStateChange as jest.Mock).mockImplementation(
    (listener) => {
      event = listener;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    },
  );
  useAuthStore.setState({
    session: null,
    ready: false,
    initializationSlow: false,
    confirmationEmail: null,
  });
  const stop = observeAuth();
  await render(<Home />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(9_000);
  });
  expect(screen.getByText(/gjenopprette innloggingen/)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Logg inn eller opprett konto" }),
  ).toBeNull();
  await act(() => acceptAuthSession({ user: { id: "signed-in" } } as Session));
  await act(() => event("INITIAL_SESSION", null));
  expect(screen.getByText("Turer å dele.")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Logg inn eller opprett konto" }),
  ).toBeNull();
  await act(() => event("SIGNED_OUT", null));
  expect(
    screen.getByRole("button", { name: "Logg inn eller opprett konto" }),
  ).toBeTruthy();
  stop?.();
  jest.useRealTimers();
});
