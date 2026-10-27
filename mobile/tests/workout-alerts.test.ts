import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import {
  observeKilometerAlerts,
  playWorkoutAlert,
} from "../src/features/tracking/alerts";
import { appPersistence, useAppStore } from "../src/stores/useAppStore";
import { initialRecording } from "../src/features/tracking/simulator";
import { useTrackingStatus } from "../src/stores/useTrackingStatus";
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: jest.requireMock("@react-native-async-storage/async-storage"),
}));
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => {}),
}));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: "success" },
}));
afterEach(async () => {
  await appPersistence.flush();
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Speech.stop).mockResolvedValue();
  useAppStore.setState({
    recording: {
      ...initialRecording,
      ownerId: "a",
      status: "recording",
      splits: [],
    },
    kilometerAlerts: "voice",
  });
  useTrackingStatus.setState({ alertError: null });
});
const split = () =>
  useAppStore.setState((s) => ({
    recording: {
      ...s.recording,
      splits: [{ kilometer: 1, seconds: 305, elapsedSeconds: 305 }],
    },
  }));
test("voice speaks Norwegian once per new kilometre and stops on pause", async () => {
  const stop = observeKilometerAlerts();
  split();
  await Promise.resolve();
  await Promise.resolve();
  expect(Speech.speak).toHaveBeenCalledWith(
    "1 kilometer. Siste kilometer: 5 minutter og 5 sekunder.",
    expect.objectContaining({ language: "nb-NO" }),
  );
  useAppStore.setState((s) => ({
    recording: { ...s.recording, seconds: 307 },
  }));
  expect(Speech.speak).toHaveBeenCalledTimes(1);
  useAppStore.setState((s) => ({
    recording: { ...s.recording, status: "paused" },
  }));
  expect(Speech.stop).toHaveBeenCalledTimes(2);
  stop();
});
test.each(["off", "simulation"])(
  "%s never triggers real alerts",
  async (condition) => {
    useAppStore.setState(
      condition === "off"
        ? { kilometerAlerts: "off" }
        : {
            recording: {
              ...initialRecording,
              mode: "simulation",
              status: "recording",
            },
          },
    );
    const stop = observeKilometerAlerts();
    split();
    await Promise.resolve();
    expect(Speech.speak).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    stop();
  },
);
test("vibration uses the real haptics adapter and preview changes no workout", async () => {
  const before = useAppStore.getState().recording;
  await playWorkoutAlert("vibration");
  expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
  expect(useAppStore.getState().recording).toBe(before);
  useAppStore.setState({ kilometerAlerts: "vibration" });
  const stop = observeKilometerAlerts();
  split();
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
  stop();
});
test("a pending voice cannot leak into a new workout or survive listener cleanup", async () => {
  let finish!: () => void;
  jest.mocked(Speech.stop).mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  const stop = observeKilometerAlerts();
  split();
  useAppStore.setState({
    recording: {
      ...initialRecording,
      status: "recording",
      ownerId: "a",
      splits: [],
    },
  });
  finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(Speech.speak).not.toHaveBeenCalled();
  stop();
});
test("voice errors are visible instead of swallowed", async () => {
  await playWorkoutAlert("voice");
  const options = jest.mocked(Speech.speak).mock.calls[0][1];
  options?.onError?.(new Error("audio"));
  expect(useTrackingStatus.getState().alertError).toMatch(/kunne ikke/);
});

test("ordinary GPS updates while speech is opening do not cancel the kilometre alert", async () => {
  let finish!: () => void;
  jest.mocked(Speech.stop).mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  const stop = observeKilometerAlerts();
  split();
  // withSplits copies the array on each valid GPS step, retaining split objects.
  useAppStore.setState((s) => ({
    recording: {
      ...s.recording,
      distance: 1.01,
      splits: [...s.recording.splits!],
    },
  }));
  finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(Speech.speak).toHaveBeenCalledTimes(1);
  stop();
});
