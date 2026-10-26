import type { Session } from "@supabase/supabase-js";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import Routes from "../src/app/routes";
import { useAuthStore } from "../src/stores/useAuthStore";
import {
  searchRoutes,
  loadSavedRoutes,
  getRoute,
  routeIsSaved,
  saveRoute,
  unsaveRoute,
} from "../src/features/routes/api";
import { suggestedRoute } from "./routes-fixture";
let mockParams: {
  tab?: string;
  id?: string;
  lat?: string;
  lon?: string;
  name?: string;
} = {};
const mockRemember = jest.fn(),
  mockForget = jest.fn(),
  mockPlan = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) =>
    jest.requireActual("react").useEffect(cb, [cb]),
}));
jest.mock("../src/components/AccountGate", () => ({
  AccountGate: ({ children }: { children: unknown }) => children,
}));
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
}));
jest.mock("../src/stores/useAppStore", () => ({
  useAppStore: Object.assign(
    (select: (s: unknown) => unknown) => select({ workouts: [] }),
    { getState: () => ({ planRoute: mockPlan }) },
  ),
}));
jest.mock("../src/stores/useRouteLibrary", () => ({
  useRouteLibrary: Object.assign(
    (select: (s: unknown) => unknown) => select({ entries: [] }),
    { getState: () => ({ remember: mockRemember, forget: mockForget }) },
  ),
}));
jest.mock("../src/features/tracking/useLiveLocation", () => ({
  useLiveLocation: () => ({ request: jest.fn() }),
}));
jest.mock("../src/components/WorkoutMap", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../src/features/routes/api", () => ({
  searchRoutes: jest.fn(),
  loadSavedRoutes: jest.fn(),
  getRoute: jest.fn(),
  routeIsSaved: jest.fn(),
  saveRoute: jest.fn(),
  unsaveRoute: jest.fn(),
}));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react"),
    { Text, Pressable } = jest.requireActual("react-native");
  const button = ({
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
        onPress: () => {
          void onPress();
        },
        disabled,
        accessibilityRole: "button",
        accessibilityLabel: title,
        accessibilityState: { disabled },
      },
      React.createElement(Text, null, title),
    );
  return {
    Txt: Text,
    Icon: () => null,
    useTheme: () => ({ text: "#111", border: "#ddd", muted: "#555" }),
    Button: button,
    Chip: button,
  };
});
jest.mock("../src/components/SocialUi", () => ({
  IconButton: ({ label, ...props }: { label: string }) =>
    jest
      .requireActual("react")
      .createElement(jest.requireMock("../src/components/ui").Button, {
        title: label,
        ...props,
      }),
}));
const press = (name: string) =>
  fireEvent.press(screen.getByRole("button", { name }));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { lat: "60.39", lon: "5.32", name: "Bergen" };
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "owner" } } as Session,
  });
  jest.mocked(searchRoutes).mockResolvedValue([suggestedRoute]);
  jest.mocked(loadSavedRoutes).mockResolvedValue({ routes: [], next: null });
  jest.mocked(getRoute).mockResolvedValue(suggestedRoute);
  jest.mocked(routeIsSaved).mockResolvedValue(null);
  jest.mocked(saveRoute).mockResolvedValue(undefined);
  jest.mocked(unsaveRoute).mockResolvedValue(undefined);
  mockPlan.mockReturnValue(true);
});
test("discovery requires an explicit search and uses the selected place and length", async () => {
  await render(<Routes />);
  expect(searchRoutes).not.toHaveBeenCalled();
  await press("10 km");
  await press("Finn løyper");
  expect(searchRoutes).toHaveBeenCalledWith(
    "owner",
    expect.objectContaining({
      latitude: 60.39,
      longitude: 5.32,
      length: 10000,
    }),
    expect.anything(),
  );
  expect(screen.getByText("Løyper ved Bergen")).toBeTruthy();
  await press("Se og lagre løypa");
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/routes",
    params: { id: suggestedRoute.id, name: "Løperunde ved Bergen" },
  });
});
test("missing provider configuration is actionable and never replaced with fake recommendations", async () => {
  jest
    .mocked(searchRoutes)
    .mockRejectedValueOnce({ code: "ROUTES_NOT_CONFIGURED" });
  await render(<Routes />);
  await press("Finn løyper");
  expect(screen.getByRole("alert")).toHaveTextContent(/ikke aktivert/);
  expect(
    screen.queryByRole("button", { name: "Se og lagre løypa" }),
  ).toBeNull();
});
test("save acknowledgement comes from the server, preserves a private title and retry does not pretend success", async () => {
  mockParams = { id: suggestedRoute.id, name: "Løperunde ved Bergen" };
  jest.mocked(saveRoute).mockRejectedValueOnce(new Error("offline"));
  await render(<Routes />);
  await fireEvent.changeText(
    screen.getByLabelText("Navn på lagret løype"),
    "Min runde i Bergen",
  );
  await press("Lagre løypa");
  expect(mockRemember).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/forbindelsen/);
  await press("Lagre løypa");
  expect(saveRoute).toHaveBeenLastCalledWith(
    "owner",
    suggestedRoute.id,
    expect.anything(),
    "Min runde i Bergen",
  );
  expect(mockRemember).toHaveBeenCalledWith(
    "owner",
    expect.objectContaining({ name: "Min runde i Bergen" }),
  );
  expect(screen.getByText("Løypa er lagret på kontoen din.")).toBeTruthy();
  await press("Bruk løypa");
  expect(mockPlan).toHaveBeenCalledWith(
    { ...suggestedRoute, name: "Min runde i Bergen" },
    "owner",
  );
  expect(router.push).toHaveBeenCalledWith("/(tabs)/track");
});
test("cloud library restores saved names and empty state is not shown during loading", async () => {
  mockParams = { tab: "saved" };
  jest.mocked(loadSavedRoutes).mockResolvedValue({
    routes: [{ ...suggestedRoute, name: "Morgentur i Bergen" }],
    next: null,
  });
  await render(<Routes />);
  expect(
    screen.getByRole("button", { name: "Åpne Morgentur i Bergen" }),
  ).toBeTruthy();
  expect(loadSavedRoutes).toHaveBeenCalledWith(
    "owner",
    null,
    expect.anything(),
  );
});
test("changing accounts cancels old search responses", async () => {
  let resolve!: (v: (typeof suggestedRoute)[]) => void;
  jest.mocked(searchRoutes).mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  await render(<Routes />);
  await press("Finn løyper");
  const signal = jest.mocked(searchRoutes).mock.calls[0][2];
  await act(() =>
    useAuthStore.setState({ session: { user: { id: "other" } } as Session }),
  );
  expect(signal.aborted).toBe(true);
  await act(() => resolve([suggestedRoute]));
  expect(screen.queryByText("Løyper ved Bergen")).toBeNull();
});
