import type { Session } from "@supabase/supabase-js";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import {
  startBackground,
  stopBackground,
} from "../src/features/tracking/background.native";
import { beginRecording } from "../src/features/tracking/controls";
import { useAppStore } from "../src/stores/useAppStore";
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
  jest.mocked(Location.startLocationUpdatesAsync).mockClear();
  jest.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValue({
    granted: true,
  } as Location.LocationPermissionResponse);
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
