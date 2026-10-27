import type { Session } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import TrainingSettings from "../src/app/training-settings";
import { observeWorkoutActivity } from "../src/features/tracking/liveActivity.ios";
import type { WorkoutActivity } from "../src/features/tracking/liveActivityController";
import {
  initialRecording,
  transition,
} from "../src/features/tracking/simulator";
import { appPersistence, useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useTrackingStatus } from "../src/stores/useTrackingStatus";

jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: jest.requireMock("@react-native-async-storage/async-storage"),
}));
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
jest.mock("../src/features/tracking/background", () => ({
  backgroundSupported: true,
}));
jest.mock("../src/features/tracking/liveActivitySupport", () => ({
  liveActivitySupported: true,
}));
jest.mock("../src/features/tracking/alerts", () => ({
  playWorkoutAlert: jest.fn(),
  stopWorkoutSpeech: jest.fn(async () => {}),
}));
jest.mock("../src/components/SettingsUi", () => ({
  Page: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../src/components/ui", () => ({
  Txt: jest.requireActual("react-native").Text,
  Button: () => null,
  Chip: () => null,
  styles: {},
}));
jest.mock("../src/features/tracking/liveActivitySupport.ios", () => ({
  liveActivitySupported: true,
  workoutMapModule: {
    activitiesEnabled: () => true,
    snapshot: jest.fn(async () => "file:///workout.png"),
    clear: jest.fn(async () => {}),
  },
}));
jest.mock("../src/features/tracking/WorkoutActivity.ios", () => ({
  default: {
    getInstances: () => mockInstances,
    start: (...args: unknown[]) => mockStart(...args),
  },
}));
let mockInstances: WorkoutActivity[] = [];
const mockStart = jest.fn((...args: unknown[]): WorkoutActivity => {
  void args;
  const id = String(mockStart.mock.calls.length);
  const activity: WorkoutActivity = {
    getId: () => id,
    update: jest.fn(async () => {}),
    end: jest.fn(async () => {
      mockInstances = mockInstances.filter((a) => a !== activity);
    }),
  };
  mockInstances.push(activity);
  return activity;
});
let stop: (() => void) | undefined;
const settle = async () => {
  await act(async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
  });
};
const toggle = async (name: string, enabled: boolean) => {
  await fireEvent(screen.getByLabelText(name), "valueChange", enabled);
  await settle();
};
beforeEach(() => {
  mockStart.mockClear();
  mockInstances = [];
  AppState.currentState = "active";
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "runner" } } as Session,
  });
  useAppStore.setState({
    ready: true,
    recording: initialRecording,
    backgroundRecording: true,
    workoutLiveActivity: true,
  });
  useTrackingStatus.setState({
    backgroundActive: false,
    liveActivityError: null,
  });
});
afterEach(async () => {
  stop?.();
  stop = undefined;
  await settle();
  await appPersistence.flush();
});

test("background off/on remembers the map choice after reopening settings and starts the next workout display", async () => {
  stop = observeWorkoutActivity();
  await render(<TrainingSettings />);
  await toggle("Fortsett med låst skjerm", false);
  expect(
    screen.getByLabelText("Vis tid og km på låseskjermen").props.value,
  ).toBe(false);
  expect(useAppStore.getState().workoutLiveActivity).toBe(true);
  await appPersistence.flush();
  await act(async () => {
    await useAppStore.persist.rehydrate();
  });
  await toggle("Fortsett med låst skjerm", true);
  expect(
    screen.getByLabelText("Vis tid og km på låseskjermen").props.value,
  ).toBe(true);
  await act(() => useAppStore.getState().event("start"));
  await settle();
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(useAppStore.getState().recording.status).toBe("recording");
});

test("explicitly hiding the map remains respected after background off/on", async () => {
  stop = observeWorkoutActivity();
  await render(<TrainingSettings />);
  await toggle("Vis tid og km på låseskjermen", false);
  await toggle("Fortsett med låst skjerm", false);
  await toggle("Fortsett med låst skjerm", true);
  await act(() => useAppStore.getState().event("start"));
  await settle();
  expect(mockStart).not.toHaveBeenCalled();
  expect(useAppStore.getState().workoutLiveActivity).toBe(false);
});

test("map off/on during a background workout recreates the display each time without changing GPS or the route", async () => {
  const recording = {
    ...transition(initialRecording, "start", Date.now()),
    ownerId: "runner",
    route: [[{ latitude: 59.9, longitude: 10.7 }]],
  };
  useAppStore.setState({ recording });
  useTrackingStatus.setState({ backgroundActive: true });
  stop = observeWorkoutActivity();
  await render(<TrainingSettings />);
  await settle();
  for (let i = 0; i < 3; i++) {
    expect(
      screen.getByLabelText("Vis tid og km på låseskjermen").props.disabled,
    ).toBe(false);
    const previous = mockInstances[0];
    await toggle("Vis tid og km på låseskjermen", false);
    expect(previous.end).toHaveBeenCalledWith("immediate");
    expect(mockInstances).toHaveLength(0);
    await toggle("Vis tid og km på låseskjermen", true);
    expect(mockInstances).toHaveLength(1);
    expect(mockStart).toHaveBeenCalledTimes(i + 2);
    expect(useAppStore.getState().recording).toBe(recording);
    expect(useTrackingStatus.getState().backgroundActive).toBe(true);
  }
});

test("a remembered map choice never starts a Live Activity with background recording off", async () => {
  useAppStore.setState({
    backgroundRecording: false,
    recording: {
      ...transition(initialRecording, "start", Date.now()),
      ownerId: "runner",
    },
  });
  stop = observeWorkoutActivity();
  await render(<TrainingSettings />);
  await settle();
  expect(mockStart).not.toHaveBeenCalled();
  expect(
    screen.getByLabelText("Vis tid og km på låseskjermen").props.value,
  ).toBe(false);
  expect(
    screen.getByLabelText("Vis tid og km på låseskjermen").props.disabled,
  ).toBe(true);
  expect(useAppStore.getState().workoutLiveActivity).toBe(true);
});

test("explicit map off/on can restore a paused display without resuming recording", async () => {
  const recording = {
    ...transition(initialRecording, "start", Date.now()),
    ownerId: "runner",
    status: "paused" as const,
    seconds: 42,
  };
  useAppStore.setState({ recording });
  stop = observeWorkoutActivity();
  await render(<TrainingSettings />);
  await settle();
  expect(mockStart).not.toHaveBeenCalled();
  await toggle("Vis tid og km på låseskjermen", false);
  await toggle("Vis tid og km på låseskjermen", true);
  expect(mockStart).toHaveBeenCalledWith(
    expect.objectContaining({ paused: true, seconds: "00:42" }),
    "vyro://track",
    expect.any(Date),
  );
  expect(useAppStore.getState().recording).toBe(recording);
  expect(useTrackingStatus.getState().backgroundActive).toBe(false);
});

test("loading a saved map preference at cold start never revives a paused workout display", async () => {
  useAppStore.setState({ ready: false, workoutLiveActivity: false });
  stop = observeWorkoutActivity();
  await settle();
  useAppStore.setState({
    ready: true,
    workoutLiveActivity: true,
    recording: {
      ...initialRecording,
      status: "paused",
      ownerId: "runner",
      seconds: 42,
    },
  });
  await settle();
  expect(mockStart).not.toHaveBeenCalled();
});
