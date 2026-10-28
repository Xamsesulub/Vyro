import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import type { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import Summary from "../src/app/summary";
import WorkoutStats from "../src/components/WorkoutStats";
import { useAppStore, appPersistence } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import { initialRecording } from "../src/features/tracking/simulator";

jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { View, Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: ({
      children,
      numberOfLines,
    }: {
      children: React.ReactNode;
      numberOfLines?: number;
    }) => React.createElement(Text, { numberOfLines }, children),
    Icon: () => null,
    Card: View,
    Screen: ({
      children,
      footer,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
    }) =>
      React.createElement(
        View,
        null,
        children,
        React.createElement(View, { testID: "fixed-actions" }, footer),
      ),
    useTheme: () => ({
      text: "black",
      surface: "white",
      muted: "gray",
      border: "gray",
      accent: "green",
    }),
    styles: {},
    Button: ({
      title,
      disabled,
      onPress,
    }: {
      title: string;
      disabled?: boolean;
      onPress: () => void;
    }) =>
      React.createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        React.createElement(Text, null, title),
      ),
    Chip: () => null,
  };
});
jest.mock("../src/components/LiveMap", () => () => null);
jest.mock("../src/components/FootballMap", () => () => null);
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    session: { user: { id: "runner" } } as Session,
    ready: true,
  });
  useAppStore.setState({
    ready: true,
    workouts: [],
    recording: {
      ...initialRecording,
      ownerId: "runner",
      status: "finishing",
      sport: "Fotball",
      seconds: 647,
      distance: 0.32,
      route: [
        [
          { latitude: 59.9, longitude: 10.7 },
          { latitude: 59.903, longitude: 10.7 },
        ],
      ],
    },
  });
});
afterEach(async () => {
  await appPersistence.flush();
});

test.each([
  [11, 0.01, "00:11", "0,01"],
  [647, 0.32, "10:47", "0,32"],
])(
  "football shows the recorded %s seconds and %s km as complete values",
  async (seconds, distance, time, km) => {
    await render(
      <WorkoutStats
        sport="Fotball"
        seconds={seconds as number}
        distance={distance as number}
        timerOnly={false}
      />,
    );
    expect(screen.getByText(time as string).props.numberOfLines).toBe(1);
    expect(screen.getByText(km as string).props.numberOfLines).toBe(1);
    expect(screen.getByText("Maksfart · km/t")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText(/For få nøyaktige GPS/)).toBeTruthy();
  },
);

test("discard is available in fixed actions before saving and requires confirmation", async () => {
  await render(<Summary />);
  const recording = useAppStore.getState().recording;
  await fireEvent.press(
    within(screen.getByTestId("fixed-actions")).getByRole("button", {
      name: "Forkast økten",
    }),
  );
  expect(useAppStore.getState().recording).toEqual(recording);
  expect(useAppStore.getState().workouts).toEqual([]);
  await fireEvent.press(screen.getByRole("button", { name: "Behold økten" }));
  expect(useAppStore.getState().recording).toEqual(recording);
  await fireEvent.press(screen.getByRole("button", { name: "Forkast økten" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Bekreft: forkast økten" }),
  );
  expect(useAppStore.getState().workouts).toEqual([]);
  expect(useAppStore.getState().recording.status).toBe("idle");
  expect(router.replace).toHaveBeenCalledWith("/(tabs)/track");
});

test("a GPS attempt with no route can be discarded even though saving is disabled", async () => {
  useAppStore.setState({
    recording: { ...useAppStore.getState().recording, distance: 0, route: [] },
  });
  await render(<Summary />);
  expect(screen.getByRole("button", { name: "Lagre økten" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Forkast økten" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Bekreft: forkast økten" }),
  );
  expect(useAppStore.getState().recording.status).toBe("idle");
  expect(useAppStore.getState().workouts).toEqual([]);
});

test("saving preserves the original measurements and does not need discard", async () => {
  await render(<Summary />);
  await fireEvent.press(screen.getByRole("button", { name: "Lagre økten" }));
  expect(useAppStore.getState().workouts).toHaveLength(1);
  expect(useAppStore.getState().workouts[0]).toMatchObject({
    seconds: 647,
    distance: 0.32,
    sport: "Fotball",
    visibility: "private",
  });
});
