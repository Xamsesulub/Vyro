import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { MapRouteSheet } from "../src/components/MapRouteSheet";
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: require("react-native").View },
  ReduceMotion: { System: "system" },
  cancelAnimation: jest.fn(),
  withTiming: (value: number) => value,
  useAnimatedStyle: () => ({}),
  useSharedValue: (initial: number) => {
    const state = require("react").useRef(initial);
    return require("react").useMemo(
      () => ({
        get: () => state.current,
        set: (value: number) => {
          state.current = value;
        },
      }),
      [],
    );
  },
}));
jest.mock("../src/components/ui", () => ({
  Txt: require("react-native").Text,
  Icon: () => null,
}));
test("the labelled handle collapses the panel, removes hidden actions and reopens it with a tap", async () => {
  jest.useFakeTimers();
  const height = jest.fn();
  await render(
    <MapRouteSheet maxHeight={350} onHeightChange={height}>
      <Pressable accessibilityRole="button" accessibilityLabel="Start en økt">
        <Text>Rutedetaljer</Text>
      </Pressable>
    </MapRouteSheet>,
  );
  expect(
    screen.getByRole("button", { name: "Minimer rutepanelet" }).props
      .accessibilityState,
  ).toEqual({ expanded: true });
  await fireEvent.press(
    screen.getByRole("button", { name: "Minimer rutepanelet" }),
  );
  await act(async () => {
    await jest.advanceTimersByTimeAsync(250);
  });
  expect(
    screen.getByRole("button", { name: "Vis rutedetaljer" }).props
      .accessibilityState,
  ).toEqual({ expanded: false });
  expect(screen.queryByRole("button", { name: "Start en økt" })).toBeNull();
  expect(height).toHaveBeenLastCalledWith(56);
  await fireEvent.press(
    screen.getByRole("button", { name: "Vis rutedetaljer" }),
  );
  expect(screen.getByRole("button", { name: "Start en økt" })).toBeTruthy();
  expect(height).toHaveBeenLastCalledWith(316);
  await screen.unmount();
  jest.useRealTimers();
});
