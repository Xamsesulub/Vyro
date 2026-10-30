import type { Session } from "@supabase/supabase-js";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import TurfScreen from "../src/app/turf";
import { useAuthStore } from "../src/stores/useAuthStore";
import {
  loadTurfs,
  loadTurf,
  loadTurfReceipt,
  submitTurf,
  withdrawTurf,
  type TurfPage,
} from "../src/features/turf/api";
import { turfWorkout, turfResult } from "./turf-fixtures";
import { loadClubContext } from "../src/features/turf/clubApi";
let mockParams: { mode?: string; workoutId?: string; turfId?: string } = {};
let mockWorkouts = [turfWorkout()];
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({ clubId: "club", ...mockParams }),
  Redirect: ({ href }: { href: unknown }) => {
    jest.requireActual("react").useEffect(() => {
      jest.requireMock("expo-router").router.replace(href);
    }, [href]);
    return null;
  },
  useFocusEffect: (cb: () => void) =>
    jest.requireActual("react").useEffect(cb, [cb]),
}));
jest.mock("../src/features/turf/clubApi", () => ({
  loadClubContext: jest.fn(),
}));
jest.mock("../src/features/turf/ClubPicker", () => ({
  ClubPicker: () => null,
}));
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
jest.mock("../src/components/AccountGate", () => ({
  AccountGate: ({ children }: { children: unknown }) => children,
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
}));
jest.mock("../src/stores/useAppStore", () => ({
  useAppStore: Object.assign(
    (select: (s: unknown) => unknown) => select({ workouts: mockWorkouts }),
    { getState: () => ({ selectTurf: () => true }) },
  ),
}));
jest.mock("../src/components/WorkoutMap", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: Text,
    Icon: () => null,
    useTheme: () => ({ border: "#ddd", text: "#111", muted: "#555" }),
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
          onPress: () => {
            void onPress();
          },
          disabled,
          accessibilityRole: "button",
          accessibilityLabel: title,
          accessibilityState: { disabled },
        },
        React.createElement(Text, null, title),
      ),
    Chip: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: "button", accessibilityLabel: title },
        React.createElement(Text, null, title),
      ),
  };
});
jest.mock("../src/components/SocialUi", () => ({
  IconButton: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) =>
    jest
      .requireActual("react")
      .createElement(jest.requireMock("../src/components/ui").Button, {
        title: label,
        onPress,
        disabled,
      }),
}));
jest.mock("../src/features/turf/api", () => ({
  ...jest.requireActual("../src/features/turf/api"),
  loadTurfs: jest.fn(),
  loadTurf: jest.fn(),
  loadTurfReceipt: jest.fn(),
  submitTurf: jest.fn(),
  withdrawTurf: jest.fn(),
}));
const page = (name: string): TurfPage => ({
  items: [
    {
      id: name,
      name,
      owner_id: "owner",
      revision: 1,
      distance_m: 600,
      seconds: 150,
      updated_at: new Date().toISOString(),
    },
  ],
  next: null,
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  jest.resetAllMocks();
  mockParams = {};
  mockWorkouts = [turfWorkout()];
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "owner" } } as Session,
  });
  jest.mocked(loadTurfs).mockResolvedValue(page("Min gamle sone"));
  jest.mocked(loadTurfReceipt).mockResolvedValue(null);
  jest.mocked(loadClubContext).mockResolvedValue({
    id: "club",
    name: "Testklubb",
    description: "",
    owner_id: "owner",
    created_at: "",
    visibility: "private",
  });
});
const press = (name: string) =>
  fireEvent.press(screen.getByRole("button", { name }));
test("Soner opens the club map in the map tab", async () => {
  await render(<TurfScreen />);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: "/(tabs)/map",
    params: { view: "zones", clubId: "club" },
  });
  expect(loadTurfs).not.toHaveBeenCalled();
});
test("creation reviews one workout then clearly confirms publication and opens the returned zone", async () => {
  mockParams = { mode: "new" };
  jest
    .mocked(submitTurf)
    .mockResolvedValue({ result: turfResult, existing: false });
  await render(<TurfScreen />);
  await press("Velg Langs elva");
  expect(screen.getByText("Se over sonen")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Legg ut sone" })).toBeDisabled();
  expect(screen.getByLabelText("Navn på sonen")).toHaveDisplayValue("");
  await fireEvent.changeText(
    screen.getByLabelText("Navn på sonen"),
    "Elvesonen",
  );
  await press("Legg ut sone");
  expect(submitTurf).toHaveBeenCalledWith(
    mockWorkouts[0],
    "owner",
    null,
    false,
    "Elvesonen",
    expect.anything(),
    "club",
  );
  expect(screen.getByText("Sonen er lagt ut!")).toBeTruthy();
  await press("Se sonen");
  expect(router.replace).toHaveBeenCalledWith({
    pathname: "/turf",
    params: { turfId: turfResult.turf_id },
  });
});
test("short recordings show the reason and cannot publish; changing workout clears the failure", async () => {
  const good = turfWorkout();
  mockWorkouts = [
    turfWorkout({
      id: "short",
      title: "Kort tur",
      turfTrace: good.turfTrace!.slice(0, 20),
    }),
    good,
  ];
  mockParams = { mode: "new", workoutId: "short" };
  await render(<TurfScreen />);
  expect(screen.getByRole("alert")).toHaveTextContent(/200 meter/);
  expect(screen.getByRole("button", { name: "Legg ut sone" })).toBeDisabled();
  await press("Velg en annen løpetur");
  await press("Velg Langs elva");
  expect(screen.queryByRole("alert")).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText("Navn på sonen"),
    "Langs elva",
  );
  expect(screen.getByRole("button", { name: "Legg ut sone" })).toBeEnabled();
  expect(submitTurf).not.toHaveBeenCalled();
});
test("a failed submission keeps the name and route, blocks double taps and can retry", async () => {
  mockParams = { workoutId: "gps-zone" };
  const pending = deferred<Awaited<ReturnType<typeof submitTurf>>>();
  jest
    .mocked(submitTurf)
    .mockRejectedValueOnce(new Error("Nettfeil"))
    .mockReturnValueOnce(pending.promise);
  await render(<TurfScreen />);
  await fireEvent.changeText(
    screen.getByLabelText("Navn på sonen"),
    "Langs elva",
  );
  await press("Legg ut sone");
  expect(screen.getByRole("alert")).toHaveTextContent(/Nettfeil/);
  expect(screen.getByLabelText("Navn på sonen")).toHaveProp(
    "value",
    "Langs elva",
  );
  await press("Legg ut sone");
  expect(screen.getByRole("button", { name: "Legger ut …" })).toBeDisabled();
  await press("Legger ut …");
  expect(submitTurf).toHaveBeenCalledTimes(2);
  await act(() => pending.resolve({ result: turfResult, existing: false }));
  expect(screen.getByText("Sonen er lagt ut!")).toBeTruthy();
});
test("a prior receipt recovers a zone even if the GPS trace is no longer usable", async () => {
  mockWorkouts = [turfWorkout({ turfTrace: [] })];
  mockParams = { workoutId: "gps-zone" };
  jest.mocked(loadTurfReceipt).mockResolvedValue(turfResult);
  await render(<TurfScreen />);
  expect(screen.getByText("Økten er allerede brukt")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  await press("Se sonen fra denne økten");
  expect(router.replace).toHaveBeenCalledWith({
    pathname: "/turf",
    params: { turfId: "zone-server" },
  });
  expect(submitTurf).not.toHaveBeenCalled();
});
test("deep-linked zones load by id and withdrawal still requires confirmation", async () => {
  mockParams = { turfId: "old-zone" };
  jest
    .mocked(loadTurf)
    .mockResolvedValue({ ...page("old-zone").items[0], route: [] });
  jest.mocked(withdrawTurf).mockResolvedValue(undefined);
  await render(<TurfScreen />);
  expect(loadTurf).toHaveBeenCalledWith("old-zone", expect.anything());
  expect(loadTurfs).not.toHaveBeenCalled();
  await press("Trekk tilbake sonen");
  expect(withdrawTurf).not.toHaveBeenCalled();
  await press("Bekreft: fjern sonen");
  expect(withdrawTurf).toHaveBeenCalledWith("old-zone", "owner");
  expect(router.replace).toHaveBeenCalledWith("/turf");
});
test("account switching cancels the previous club lookup", async () => {
  mockParams = { mode: "new" };
  const old = deferred<Awaited<ReturnType<typeof loadClubContext>>>();
  jest.mocked(loadClubContext).mockReturnValueOnce(old.promise);
  await render(<TurfScreen />);
  const signal = jest.mocked(loadClubContext).mock.calls[0][2]!;
  await act(() =>
    useAuthStore.setState({ session: { user: { id: "other" } } as Session }),
  );
  expect(signal.aborted).toBe(true);
  await act(() =>
    old.resolve({
      id: "old",
      name: "Tidligere konto",
      description: "",
      owner_id: "owner",
      visibility: "private",
      created_at: "",
    }),
  );
  expect(screen.queryByText(/Tidligere konto/)).toBeNull();
  expect(loadClubContext).toHaveBeenLastCalledWith(
    "club",
    "other",
    expect.anything(),
  );
});
