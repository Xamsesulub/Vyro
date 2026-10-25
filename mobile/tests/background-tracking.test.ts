import type { Session } from "@supabase/supabase-js";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  startBackground,
  stopBackground,
  verifyBackgroundRecording,
} from "../src/features/tracking/background.native";
import { beginRecording } from "../src/features/tracking/controls";
import { appPersistence, useAppStore } from "../src/stores/useAppStore";
import { observeRecording } from "../src/features/tracking/lifecycle";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useTrackingStatus } from "../src/stores/useTrackingStatus";
import { initialRecording } from "../src/features/tracking/simulator";
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));
jest.mock("../src/features/tracking/background", () =>
  jest.requireActual("../src/features/tracking/background.native"),
);
jest.mock("expo-task-manager", () => ({
  isTaskDefined: jest.fn(() => false),
  defineTask: jest.fn(),
  isAvailableAsync: jest.fn(async () => true),
}));
jest.mock("expo-location", () => ({
  Accuracy: { BestForNavigation: 6 },
  ActivityType: { Fitness: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getBackgroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  startLocationUpdatesAsync: jest.fn(async () => {}),
  stopLocationUpdatesAsync: jest.fn(async () => {}),
  hasStartedLocationUpdatesAsync: jest.fn(async () => true),
}));
const owner = { user: { id: "runner" } } as Session;
beforeEach(async () => {
  await stopBackground();
  useAuthStore.setState({ session: owner, ready: true });
  useAppStore.setState({
    ready: true,
    backgroundRecording: true,
    recording: initialRecording,
  });
  useTrackingStatus.setState({
    starting: false,
    backgroundActive: false,
    error: null,
  });
  await stopBackground();
  jest
    .mocked(Location.startLocationUpdatesAsync)
    .mockReset()
    .mockResolvedValue();
  jest
    .mocked(Location.hasStartedLocationUpdatesAsync)
    .mockReset()
    .mockResolvedValue(true);
  jest
    .mocked(Location.getBackgroundPermissionsAsync)
    .mockReset()
    .mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);
  jest.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValue({
    granted: true,
  } as Location.LocationPermissionResponse);
});

test("locking and app switching keep native recording active, receive GPS and persist elapsed time without timer ticks", async () => {
  let now = 1_800_000_000_000;
  const clock = jest.spyOn(Date, "now").mockImplementation(() => now);
  let change!: (state: AppStateStatus) => void;
  const removed = jest.fn();
  const events = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_, listener) => {
      change = listener;
      return { remove: removed };
    });
  AppState.currentState = "active";
  const stop = observeRecording();
  try {
    await beginRecording("start");
    const start = now;
    const task = jest.mocked(TaskManager.defineTask).mock.calls[0][1];
    const location = (seconds: number) => ({
      coords: { latitude: 59 + seconds * 0.000005, longitude: 10, accuracy: 5 },
      timestamp: start + seconds * 1000,
    });
    await task({ data: { locations: [location(0)] } } as never);
    now += 10_000;
    AppState.currentState = "inactive";
    change("inactive");
    AppState.currentState = "background";
    change("background");
    expect(useAppStore.getState().recording.status).toBe("recording");
    now += 60_000;
    await task({
      data: { locations: [10, 20, 30, 40, 50, 60, 70].map(location) },
    } as never);
    expect(useAppStore.getState().recording.distance).toBeGreaterThan(0.03);
    expect(useAppStore.getState().recording.seconds).toBe(70);
    await appPersistence.flush();
    const stored = JSON.parse(
      (await AsyncStorage.getItem("vyro-prototype-v1"))!,
    );
    expect(stored.state.recording.seconds).toBe(70);
    expect(stored.state.recording.route[0]).toHaveLength(8);
    now += 5_000;
    AppState.currentState = "active";
    change("active");
    await verifyBackgroundRecording();
    expect(useAppStore.getState().recording.status).toBe("recording");
    expect(useAppStore.getState().recording.seconds).toBe(75);
    useAppStore.getState().event("pause");
    now += 30_000;
    change("background");
    expect(useAppStore.getState().recording.seconds).toBe(75);
    expect(useTrackingStatus.getState().backgroundActive).toBe(false);
  } finally {
    stop();
    clock.mockRestore();
    events.mockRestore();
    AppState.currentState = "active";
  }
  expect(removed).toHaveBeenCalledTimes(1);
});

test("an unregistered native service never claims to record with a locked screen", async () => {
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false);
  await beginRecording("start");
  expect(useAppStore.getState().recording.status).toBe("paused");
  expect(useTrackingStatus.getState().backgroundActive).toBe(false);
  expect(useTrackingStatus.getState().error).toContain("startet ikke");
});

test.each(["permission", "service"])(
  "returning after lost %s pauses without discarding or restarting GPS",
  async (lost) => {
    await beginRecording("start");
    const start = useAppStore.getState().recording.segmentStartedAt!;
    useAppStore
      .getState()
      .gpsFix({ latitude: 59, longitude: 10, timestamp: start, accuracy: 5 });
    const route = useAppStore.getState().recording.route;
    if (lost === "permission")
      jest
        .mocked(Location.getBackgroundPermissionsAsync)
        .mockResolvedValue({
          granted: false,
        } as Location.LocationPermissionResponse);
    else
      jest
        .mocked(Location.hasStartedLocationUpdatesAsync)
        .mockResolvedValue(false);
    await verifyBackgroundRecording();
    expect(useAppStore.getState().recording.status).toBe("paused");
    expect(useAppStore.getState().recording.route).toEqual(route);
    expect(useTrackingStatus.getState().error).toContain(
      "stoppet av telefonen",
    );
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  },
);

test("a delayed service check cannot pause a later resumed segment", async () => {
  const clock = jest.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
  try {
    await beginRecording("start");
    let complete!: (value: boolean) => void;
    jest.mocked(Location.hasStartedLocationUpdatesAsync).mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const checking = verifyBackgroundRecording();
    useAppStore.getState().event("pause");
    clock.mockReturnValue(1_800_000_010_000);
    await beginRecording("resume");
    complete(false);
    await checking;
    expect(useAppStore.getState().recording.status).toBe("recording");
    expect(useTrackingStatus.getState().backgroundActive).toBe(true);
  } finally {
    clock.mockRestore();
  }
});
test("background permission denial leaves the recording idle and reports an actionable error", async () => {
  jest
    .mocked(Location.requestBackgroundPermissionsAsync)
    .mockResolvedValueOnce({
      granted: false,
    } as Location.LocationPermissionResponse);
  await beginRecording("start");
  expect(useAppStore.getState().recording.status).toBe("idle");
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  expect(useTrackingStatus.getState().error).toContain("innstillinger");
});
test("start registers a foreground notification; pause stops GPS and resume starts a new segment", async () => {
  await beginRecording("start");
  expect(useTrackingStatus.getState().backgroundActive).toBe(true);
  expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      foregroundService: expect.objectContaining({
        killServiceOnDestroy: true,
      }),
      showsBackgroundLocationIndicator: true,
    }),
  );
  useAppStore.getState().event("pause");
  expect(useTrackingStatus.getState().backgroundActive).toBe(false);
  await beginRecording("resume");
  expect(useAppStore.getState().recording.route).toHaveLength(2);
  expect(useTrackingStatus.getState().backgroundActive).toBe(true);
});
test("account change while permission dialog is open never starts another account's recording", async () => {
  let grant!: (result: Location.LocationPermissionResponse) => void;
  jest.mocked(Location.requestBackgroundPermissionsAsync).mockReturnValueOnce(
    new Promise((resolve) => {
      grant = resolve;
    }),
  );
  const pending = beginRecording("start");
  await new Promise((resolve) => setTimeout(resolve, 0));
  useAuthStore.setState({ session: { user: { id: "other" } } as Session });
  grant({ granted: true } as Location.LocationPermissionResponse);
  await pending;
  expect(useAppStore.getState().recording.status).toBe("idle");
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});
test("a cold task cannot resume a persisted draft or collect without an active owner", async () => {
  useAppStore.setState({
    recording: { ...initialRecording, status: "paused", ownerId: "runner" },
  });
  await startBackground();
  const task = jest.mocked(TaskManager.defineTask).mock.calls[0][1];
  await task({
    data: {
      locations: [
        {
          coords: { latitude: 59, longitude: 10, accuracy: 5 },
          timestamp: Date.now(),
        },
      ],
    },
  } as never);
  expect(useAppStore.getState().recording.route).toEqual([]);
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});
test("late pre-resume GPS callbacks are rejected and runtime GPS errors pause the workout", async () => {
  await beginRecording("start");
  const r = useAppStore.getState().recording;
  useAppStore.getState().gpsFix({
    latitude: 59,
    longitude: 10,
    accuracy: 5,
    timestamp: r.segmentStartedAt! - 1000,
  });
  expect(useAppStore.getState().recording.route).toEqual([[]]);
  const task = jest.mocked(TaskManager.defineTask).mock.calls[0][1];
  await task({ error: { message: "GPS stopped" } } as never);
  expect(useAppStore.getState().recording.status).toBe("paused");
  expect(useTrackingStatus.getState().backgroundActive).toBe(false);
});
