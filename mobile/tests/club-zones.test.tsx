import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { ClubZones } from "../src/features/turf/ClubZones";
import {
  loadClubContext,
  loadClubScores,
  loadClubTurfs,
  type ClubTurf,
} from "../src/features/turf/clubApi";
import { loadClubPage, type Club } from "../src/features/clubs/api";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  useFocusEffect: (fn: () => void) =>
    jest.requireActual("react").useEffect(fn, [fn]),
}));
jest.mock("../src/features/turf/clubApi", () => ({
  loadClubContext: jest.fn(),
  loadClubScores: jest.fn(),
  loadClubTurfs: jest.fn(),
}));
jest.mock("../src/features/clubs/api", () => ({ loadClubPage: jest.fn() }));
jest.mock("../src/features/turf/api", () => ({
  turfError: (e: Error) => e.message,
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock("../src/components/Brand", () => ({ BrandWordmark: () => null }));
jest.mock("../src/components/MapSearch", () => ({ MapSearch: () => null }));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react"),
    { Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: Text,
    Icon: () => null,
    useTheme: () => ({
      bg: "white",
      surface: "white",
      raised: "#eee",
      text: "#111",
      muted: "#555",
      border: "#ddd",
    }),
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
        },
        React.createElement(Text, null, title),
      ),
  };
});
jest.mock("../src/components/SocialUi", () => {
  const React = jest.requireActual("react"),
    { Pressable, Text } = jest.requireActual("react-native");
  return {
    Avatar: () => null,
    IconButton: ({
      label,
      onPress,
      disabled,
    }: {
      label: string;
      onPress: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        Pressable,
        {
          onPress,
          disabled,
          accessibilityRole: "button",
          accessibilityLabel: label,
        },
        React.createElement(Text, null, label),
      ),
  };
});
jest.mock("../src/features/turf/ClubPicker", () => {
  const React = jest.requireActual("react"),
    { Pressable, Text } = jest.requireActual("react-native");
  return {
    ClubPicker: ({ onSelect }: { onSelect: (club: Club) => void }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: "Velg klubb B",
          onPress: () =>
            onSelect({
              id: "b",
              name: "Klubb B",
              member_count: 20,
              description: "",
              owner_id: "me",
              visibility: "private",
              created_at: "",
            }),
        },
        React.createElement(Text, null, "Velg klubb B"),
      ),
  };
});
jest.mock("../src/features/turf/ClubZoneMap", () => {
  const React = jest.requireActual("react"),
    { View, Pressable, Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: ({
      turfs,
      onSelect,
    }: {
      turfs: ClubTurf[];
      onSelect: (id: string) => void;
    }) =>
      React.createElement(
        View,
        null,
        turfs.map((t) =>
          React.createElement(
            Pressable,
            {
              key: t.id,
              onPress: () => onSelect(t.id),
              accessibilityRole: "button",
              accessibilityLabel: `Kartnål ${t.name}`,
            },
            React.createElement(Text, null, t.name),
          ),
        ),
      ),
  };
});

const club: Club = {
  id: "a",
  name: "Klubb A",
  description: "",
  owner_id: "me",
  created_at: "",
  visibility: "private",
  member_count: 20,
};
const zone = (id: string, name: string): ClubTurf => ({
  id,
  name,
  club_id: "a",
  owner_id: "other",
  revision: 1,
  updated_at: "",
  route: [
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.91, longitude: 10.71 },
  ],
  distance_m: 1200,
  seconds: 360,
  profiles: { display_name: "Mina", avatar_path: null },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const press = (name: string) =>
  fireEvent.press(screen.getByRole("button", { name }));
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(loadClubPage).mockResolvedValue({ items: [club], more: false });
  jest.mocked(loadClubContext).mockResolvedValue(club);
  jest.mocked(loadClubTurfs).mockResolvedValue({
    items: [zone("z1", "Elverunden"), zone("z2", "Parken")],
    next: null,
  });
  jest.mocked(loadClubScores).mockResolvedValue({
    items: [
      {
        user_id: "other",
        display_name: "Mina",
        avatar_path: null,
        place: 1,
        zones: 2,
        distance_m: 2400,
      },
      {
        user_id: "me",
        display_name: "Alex",
        avatar_path: null,
        place: 2,
        zones: 0,
        distance_m: 0,
      },
    ],
    more: false,
  });
});
test("map pins select a zone; the detail and new submission retain the club context", async () => {
  await render(<ClubZones userId="me" />);
  expect(loadClubTurfs).toHaveBeenCalledWith("a", expect.any(AbortSignal));
  await press("Kartnål Parken");
  await press("Se sonen");
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: "/turf",
    params: { turfId: "z2" },
  });
  await press("Legg ut sone");
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: "/turf",
    params: { mode: "new", clubId: "a" },
  });
  await fireEvent.press(screen.getByRole("tab", { name: "Resultater" }));
  expect(screen.getByText("2 soner")).toBeTruthy();
  expect(screen.getByText("Alex · deg")).toBeTruthy();
  expect(screen.getByText("0 soner")).toBeTruthy();
});
test("switching clubs cancels old requests and cannot show a late result from the old club", async () => {
  const old = deferred<Awaited<ReturnType<typeof loadClubTurfs>>>();
  jest.mocked(loadClubTurfs).mockImplementation((id) =>
    id === "a"
      ? old.promise
      : Promise.resolve({
          items: [{ ...zone("new", "Ny klubb sin sone"), club_id: "b" }],
          next: null,
        }),
  );
  await render(<ClubZones userId="me" />);
  const oldSignal = jest.mocked(loadClubTurfs).mock.calls[0][1];
  await press("Velg klubb B");
  expect(oldSignal.aborted).toBe(true);
  await act(() =>
    old.resolve({ items: [zone("old", "Privat gammel sone")], next: null }),
  );
  expect(screen.queryByText("Privat gammel sone")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Kartnål Ny klubb sin sone" }),
  ).toBeTruthy();
});
test("membership rejection during refresh removes previously shown map and results", async () => {
  await render(<ClubZones userId="me" initialClubId="a" />);
  jest
    .mocked(loadClubTurfs)
    .mockRejectedValueOnce(new Error("TURF_CLUB_MEMBERSHIP"));
  await press("Oppdater klubbens soner");
  expect(screen.getByRole("alert")).toHaveTextContent("TURF_CLUB_MEMBERSHIP");
  expect(
    screen.queryByRole("button", { name: "Kartnål Elverunden" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Se sonen" })).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: "Resultater" }));
  expect(screen.queryByText("Mina")).toBeNull();
});
test("a club without zones offers the first submission without invented competitors", async () => {
  jest.mocked(loadClubTurfs).mockResolvedValue({ items: [], next: null });
  await render(<ClubZones userId="me" />);
  expect(screen.getByText("Den første sonen er deres")).toBeTruthy();
  await press("Legg ut første sone");
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/turf",
    params: { mode: "new", clubId: "a" },
  });
});
test("a club deep link checks membership before asking for its zones", async () => {
  jest
    .mocked(loadClubContext)
    .mockRejectedValue(new Error("TURF_CLUB_MEMBERSHIP"));
  await render(<ClubZones userId="me" initialClubId="private" />);
  expect(loadClubTurfs).not.toHaveBeenCalled();
  expect(screen.getByText("Klubbens soner starter her")).toBeTruthy();
});
