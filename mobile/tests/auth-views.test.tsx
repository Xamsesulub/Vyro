import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { View, Text } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import Profile from "../src/app/(tabs)/profile";
import Settings from "../src/app/settings";
import { AccountGate } from "../src/components/AccountGate";
import { observeAuth, useAuthStore } from "../src/stores/useAuthStore";
import { supabase } from "../src/lib/supabase";
import Home from "../src/app/(tabs)/index";
import { acceptAuthSession } from "../src/stores/useAuthStore";
import { useProfileStore } from "../src/stores/useProfileStore";
import { shareProfile } from "../src/features/social/shareProfile";

jest.mock("../src/features/social/shareProfile", () => ({
  shareProfile: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: {
    prefetch: jest.fn(),
    push: jest.fn(),
    setParams: jest.fn(),
    canGoBack: () => false,
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
  useFocusEffect: (callback: () => void) =>
    jest.requireActual("react").useEffect(callback, [callback]),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
}));
jest.mock("../src/features/social/homeFeed", () => ({
  loadHomeFeed: jest.fn(async () => ({ posts: [], next: null })),
}));
jest.mock("../src/components/CloudPost", () => ({ CloudPost: () => null }));
jest.mock("../src/components/TurfEvents", () => ({ TurfEvents: () => null }));
jest.mock("../src/lib/supabase", () => ({
  supabase: { from: jest.fn(), auth: { onAuthStateChange: jest.fn() } },
}));
jest.mock("../src/stores/useAppStore", () => {
  const state = {
    name: "Lokalt navn",
    examplesVisible: false,
    goal: 20,
    theme: "light",
    preferences: jest.fn(),
    workouts: [
      {
        id: "sim",
        title: "Lokal testsimulering",
        sport: "Løping",
        date: "2026-10-25T10:00:00Z",
        source: "simulation",
        distance: 1,
        seconds: 300,
      },
      {
        id: "private",
        title: "En annen kontos GPS-økt",
        sport: "Løping",
        date: "2026-10-25T10:00:00Z",
        source: "gps",
        ownerId: "someone-else",
        distance: 1,
        seconds: 300,
      },
    ],
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
  ActivityCard: ({ workout }: { workout: { title: string } }) =>
    jest
      .requireActual("react")
      .createElement(
        jest.requireActual("react-native").Text,
        null,
        workout.title,
      ),
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
  expect(screen.getByText("0 aktiviteter")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Konto og sikkerhet" }),
  ).toBeTruthy();
  expect(screen.queryByText(/Logg inn/)).toBeNull();
  expect(screen.getByText("Turer å dele.")).toBeTruthy();
  await screen.unmount();
  await render(<Screens />);
  expect(screen.getAllByText("Kontonavn").length).toBeTruthy();
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
    screen.queryByRole("button", { name: "Konto og sikkerhet" }),
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
  expect(screen.getByText("Fullfør innlogging · ikke innlogget")).toBeTruthy();
  expect(screen.queryByText("Privat innhold")).toBeNull();
  expect(
    screen.getAllByRole("button", { name: "Logg inn" }).length,
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
  expect(screen.queryByRole("button", { name: "Kom i gang" })).toBeNull();
  await act(() => acceptAuthSession({ user: { id: "signed-in" } } as Session));
  await act(() => event("INITIAL_SESSION", null));
  expect(screen.getByText("Turer å dele.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Kom i gang" })).toBeNull();
  await act(() => event("SIGNED_OUT", null));
  expect(screen.getByRole("button", { name: "Kom i gang" })).toBeTruthy();
  stop?.();
  jest.useRealTimers();
});

test("guests never see old simulations or another account's GPS history", async () => {
  useAuthStore.setState({
    ready: true,
    session: null,
    confirmationEmail: null,
  });
  await render(<Profile />);
  expect(screen.queryByText("Lokal testsimulering")).toBeNull();
  expect(screen.queryByText("Simuleringer")).toBeNull();
  expect(screen.queryByText("Eksempler")).toBeNull();
  expect(screen.queryByText("En annen kontos GPS-økt")).toBeNull();
  expect(screen.getByRole("tab", { name: "Aktiviteter" })).toBeTruthy();
  expect(screen.queryByRole("tab", { name: "Fremgang" })).toBeNull();
});

const publicProfile = {
  id: "runner",
  username: "runner_a",
  display_name: "Ada",
};
function prepareProfileShare() {
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "runner", user_metadata: {} } } as Session,
  });
  useProfileStore.setState({ profile: null, loadedAt: 0, errorFor: null });
  jest.mocked(shareProfile).mockReset().mockResolvedValue("shared");
  const q = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest
      .fn()
      .mockResolvedValue({ data: null, error: new Error("offline") }),
  };
  jest.mocked(supabase!.from).mockReturnValue(q as never);
  return q;
}

test("Share profile remains actionable after a failed load and retries before opening sharing", async () => {
  const q = prepareProfileShare();
  await render(<Profile />);
  expect(screen.getByRole("button", { name: "Del profil" })).toBeEnabled();
  expect(screen.getByText(/Kunne ikke hente profilen/)).toBeTruthy();
  q.single.mockResolvedValueOnce({ data: publicProfile, error: null } as never);
  await fireEvent.press(screen.getByRole("button", { name: "Del profil" }));
  expect(shareProfile).toHaveBeenCalledWith(publicProfile);
  expect(screen.queryByText(/Kunne ikke hente profilen/)).toBeNull();
});

test("a failed sharing retry explains the failure and leaves the button usable", async () => {
  prepareProfileShare();
  await render(<Profile />);
  await fireEvent.press(screen.getByRole("button", { name: "Del profil" }));
  expect(screen.getByText(/Sjekk nettforbindelsen/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Del profil" })).toBeEnabled();
  expect(shareProfile).not.toHaveBeenCalled();
});

test.each(["logout", "unmount"])(
  "%s during a sharing retry never shares the previous profile",
  async (action) => {
    const q = prepareProfileShare();
    const view = await render(<Profile />);
    let resolve!: (value: unknown) => void;
    q.single.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    // A real press finishes while the request continues in the background.
    await userEvent.press(screen.getByRole("button", { name: "Del profil" }));
    expect(q.single).toHaveBeenCalledTimes(2); // Initial read plus one retry.
    expect(
      screen.getByRole("button", { name: "Henter profil …" }),
    ).toBeDisabled();
    if (action === "logout")
      await act(() => useAuthStore.setState({ session: null }));
    else await view.unmount();
    await act(async () => resolve({ data: publicProfile, error: null }));
    expect(shareProfile).not.toHaveBeenCalled();
  },
);

test.each(["cancelled", "error", "copied"])(
  "sharing handles %s without trapping the button",
  async (result) => {
    prepareProfileShare();
    useProfileStore.setState({ profile: publicProfile, loadedAt: Date.now() });
    if (result === "error")
      jest.mocked(shareProfile).mockRejectedValueOnce(new Error("unavailable"));
    else
      jest
        .mocked(shareProfile)
        .mockResolvedValueOnce(result as "cancelled" | "copied");
    await render(<Profile />);
    await fireEvent.press(screen.getByRole("button", { name: "Del profil" }));
    expect(screen.getByRole("button", { name: "Del profil" })).toBeEnabled();
    if (result === "error")
      expect(screen.getByText(/Kunne ikke åpne deling/)).toBeTruthy();
    if (result === "copied")
      expect(screen.getByText(/Profilteksten er kopiert/)).toBeTruthy();
    if (result === "cancelled") expect(screen.queryByRole("alert")).toBeNull();
  },
);
