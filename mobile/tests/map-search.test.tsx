import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import Maps from "../src/app/(tabs)/map";
import { searchPlaces, type Place } from "../src/features/maps/search";

const mockMapMount = jest.fn();
let mockTarget: Place | null;
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    require("react").useEffect(effect, [effect]),
}));
jest.mock("../src/components/ui", () => ({
  Txt: require("react-native").Text,
  Icon: () => null,
}));
jest.mock("../src/components/MapRouteSheet", () => ({
  MapRouteSheet: require("react-native").View,
}));
jest.mock("../src/components/LiveMap", () => ({
  __esModule: true,
  default: ({ target }: { target: Place | null }) => {
    require("react").useEffect(mockMapMount, []);
    mockTarget = target;
    return null;
  },
}));
jest.mock("../src/features/activities/useVisibleWorkouts", () => ({
  useVisibleWorkouts: () => [],
}));
jest.mock("../src/features/tracking/useLiveLocation", () => ({
  useLiveLocation: () => ({
    permission: "unknown",
    position: null,
    request: jest.fn(),
  }),
}));
jest.mock("../src/features/maps/search", () => ({ searchPlaces: jest.fn() }));

const place = {
  id: "address",
  name: "Skårersletta 15, Lørenskog",
  latitude: 59.92,
  longitude: 10.96,
};
const input = () => screen.getByLabelText("Søk etter sted");
const tap = (name: string) =>
  fireEvent.press(screen.getByRole("button", { name }));
const search = jest.mocked(searchPlaces);

beforeEach(() => {
  jest.clearAllMocks();
  search.mockReset();
  jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function enterQuery(value = "Skårersletta 15") {
  await fireEvent(input(), "focus");
  await fireEvent.changeText(input(), value);
}

test("typing uses the same top field, submits from the keyboard and selects a place without remounting the map", async () => {
  search.mockResolvedValue([place]);
  await render(<Maps />);
  const topInput = input();
  await enterQuery();
  expect(input()).toBe(topInput);
  expect(screen.getAllByLabelText(/Søk etter/)).toHaveLength(1);
  expect(screen.queryByText("Finn et sted")).toBeNull();
  expect(screen.queryByRole("button", { name: "Start en økt" })).toBeNull();
  expect(search).not.toHaveBeenCalled();
  await fireEvent(input(), "submitEditing");
  expect(search).toHaveBeenCalledWith(
    "Skårersletta 15",
    expect.any(AbortSignal),
  );
  await tap(`Vis ${place.name} på kartet`);
  expect(mockTarget).toEqual(place);
  expect(input()).toHaveDisplayValue(place.name);
  expect(Keyboard.dismiss).toHaveBeenCalled();
  expect(screen.queryByLabelText("Stedssøkresultater")).toBeNull();
  expect(screen.getByRole("button", { name: "Start en økt" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Kartlag" })).toBeTruthy();
  expect(mockMapMount).toHaveBeenCalledTimes(1);
});

test("editing aborts an older lookup and ignores its late response", async () => {
  let finish!: (places: Place[]) => void;
  search.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render(<Maps />);
  await enterQuery();
  await tap("Søk");
  const oldSignal = search.mock.calls[0][1];
  await fireEvent.changeText(input(), "Oslo");
  expect(oldSignal.aborted).toBe(true);
  search.mockResolvedValueOnce([{ ...place, id: "oslo", name: "Oslo" }]);
  await tap("Søk");
  await act(() => finish([place]));
  expect(
    screen.getByRole("button", { name: "Vis Oslo på kartet" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: `Vis ${place.name} på kartet` }),
  ).toBeNull();
  expect(mockTarget).toBeNull();
});

test("cancelling an active search restores map controls and ignores late results", async () => {
  let finish!: (places: Place[]) => void;
  search.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render(<Maps />);
  await enterQuery();
  await tap("Søk");
  await tap("Søk");
  expect(search).toHaveBeenCalledTimes(1);
  const signal = search.mock.calls[0][1];
  await tap("Avbryt søk");
  expect(signal.aborted).toBe(true);
  await act(() => finish([place]));
  expect(screen.queryByLabelText("Stedssøkresultater")).toBeNull();
  expect(mockTarget).toBeNull();
  expect(
    screen.getByRole("button", { name: "Vis lagrede ruter" }),
  ).toBeTruthy();
  await tap("Vis lagrede ruter");
  expect(
    screen.getByRole("button", { name: "Vis lagrede ruter" }).props
      .accessibilityState,
  ).toEqual({ selected: true });
});

test("empty queries do not search; failed and empty results allow another search", async () => {
  await render(<Maps />);
  await enterQuery("   ");
  await fireEvent(input(), "submitEditing");
  expect(search).not.toHaveBeenCalled();
  await fireEvent.changeText(input(), "  Oslo  ");
  search.mockRejectedValueOnce(new Error("Ingen forbindelse. Prøv igjen."));
  await tap("Søk");
  expect(screen.getByText("Ingen forbindelse. Prøv igjen.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Søk" })).toBeEnabled();
  search.mockResolvedValueOnce([]);
  await tap("Søk");
  expect(screen.getByText(/Ingen steder funnet/)).toBeTruthy();
  search.mockResolvedValueOnce([place]);
  await tap("Søk");
  expect(
    screen.getByRole("button", { name: `Vis ${place.name} på kartet` }),
  ).toBeTruthy();
  expect(search).toHaveBeenLastCalledWith("Oslo", expect.any(AbortSignal));
});

test("leaving the map aborts its search", async () => {
  search.mockImplementationOnce(() => new Promise(() => {}));
  await render(<Maps />);
  await enterQuery();
  await tap("Søk");
  const signal = search.mock.calls[0][1];
  await screen.unmount();
  expect(signal.aborted).toBe(true);
});
