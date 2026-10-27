import { Linking } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackgroundRecordingSetting } from "../src/components/BackgroundRecordingSetting";
import { initialRecording } from "../src/features/tracking/simulator";
import { useAppStore } from "../src/stores/useAppStore";

let mockSupported = true;
jest.mock("../src/features/tracking/background", () => ({
  get backgroundSupported() {
    return mockSupported;
  },
}));
jest.mock("../src/features/tracking/liveActivitySupport", () => ({
  liveActivitySupported: true,
}));
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: Text,
    styles: { row: {} },
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { accessibilityRole: "button", accessibilityLabel: title, onPress },
        React.createElement(Text, null, title),
      ),
  };
});
beforeEach(() => {
  mockSupported = true;
  useAppStore.setState({
    recording: initialRecording,
    backgroundRecording: false,
    workoutLiveActivity: false,
  });
});

test("the start-screen choice enables background recording and clearly describes an opt-out", async () => {
  await render(<BackgroundRecordingSetting compact />);
  expect(
    screen.getByText("Økten pauses hvis du låser skjermen eller bytter app."),
  ).toBeTruthy();
  await fireEvent(
    screen.getByLabelText("Fortsett med låst skjerm"),
    "valueChange",
    true,
  );
  expect(useAppStore.getState().backgroundRecording).toBe(true);
  expect(screen.getByText(/mens du bruker andre apper/)).toBeTruthy();
  await act(() => useAppStore.setState({ workoutLiveActivity: true }));
  await fireEvent(
    screen.getByLabelText("Fortsett med låst skjerm"),
    "valueChange",
    false,
  );
  expect(useAppStore.getState().workoutLiveActivity).toBe(true);
  await fireEvent(
    screen.getByLabelText("Fortsett med låst skjerm"),
    "valueChange",
    true,
  );
  expect(useAppStore.getState().backgroundRecording).toBe(true);
  expect(useAppStore.getState().workoutLiveActivity).toBe(true);
});

test("Expo Go cannot enable an unsupported native feature", async () => {
  mockSupported = false;
  await render(<BackgroundRecordingSetting />);
  expect(screen.queryByRole("switch")).toBeNull();
  expect(screen.getByText(/Expo Go pauser opptaket/)).toBeTruthy();
});

test("the start screen can explicitly enable time and distance without losing the choice on background off/on", async () => {
  useAppStore.setState({ backgroundRecording: true });
  await render(<BackgroundRecordingSetting compact />);
  await fireEvent(
    screen.getByLabelText("Vis tid og km på låseskjermen"),
    "valueChange",
    true,
  );
  expect(useAppStore.getState().workoutLiveActivity).toBe(true);
  await fireEvent(
    screen.getByLabelText("Fortsett med låst skjerm"),
    "valueChange",
    false,
  );
  expect(screen.queryByLabelText("Vis tid og km på låseskjermen")).toBeNull();
  await fireEvent(
    screen.getByLabelText("Fortsett med låst skjerm"),
    "valueChange",
    true,
  );
  expect(
    screen.getByLabelText("Vis tid og km på låseskjermen").props.value,
  ).toBe(true);
});

test("an active workout disables changes to the recording mode", async () => {
  useAppStore.setState({
    recording: { ...initialRecording, status: "recording" },
  });
  await render(<BackgroundRecordingSetting />);
  expect(screen.getByLabelText("Fortsett med låst skjerm").props.disabled).toBe(
    true,
  );
  expect(
    screen.getByText("Avslutt økten før du endrer dette valget."),
  ).toBeTruthy();
});

test("the permission shortcut opens device settings and handles failure", async () => {
  useAppStore.setState({ backgroundRecording: true });
  const settings = jest
    .spyOn(Linking, "openSettings")
    .mockRejectedValueOnce(new Error("Unavailable"));
  try {
    await render(<BackgroundRecordingSetting />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Åpne posisjonsinnstillinger" }),
    );
    expect(settings).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Åpne Innstillinger på telefonen og finn VYRO."),
    ).toBeTruthy();
  } finally {
    settings.mockRestore();
  }
});
