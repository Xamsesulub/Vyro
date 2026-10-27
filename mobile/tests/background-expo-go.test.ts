import type { Session } from "@supabase/supabase-js";
import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";
import { backgroundSupported } from "../src/features/tracking/background.native";
import { beginRecording } from "../src/features/tracking/controls";
import { observeRecording } from "../src/features/tracking/lifecycle";
import { initialRecording } from "../src/features/tracking/simulator";
import { useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useTrackingStatus } from "../src/stores/useTrackingStatus";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "storeClient" },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));
jest.mock("../src/features/tracking/background", () =>
  jest.requireActual("../src/features/tracking/background.native"),
);
jest.mock("expo-task-manager", () => ({
  isTaskDefined: () => true,
  isAvailableAsync: async () => false,
}));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  requestBackgroundPermissionsAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
}));

test("Expo Go explains its foreground-only limit even when the saved preference requests background GPS", async () => {
  AppState.currentState = "active";
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "runner" } } as Session,
  });
  useAppStore.setState({
    ready: true,
    recording: initialRecording,
    backgroundRecording: true,
  });
  useTrackingStatus.setState({
    starting: false,
    error: null,
    backgroundActive: false,
  });
  let change!: (state: AppStateStatus) => void;
  const events = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_, listener) => {
      change = listener;
      return { remove: jest.fn() };
    });
  const stop = observeRecording();
  try {
    expect(backgroundSupported).toBe(false);
    await beginRecording("start");
    expect(useAppStore.getState().recording.status).toBe("recording");
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
    change("background");
    expect(useAppStore.getState().recording.status).toBe("paused");
    expect(useTrackingStatus.getState().error).toContain("egen installasjon");
    change("active");
    expect(useAppStore.getState().recording.status).toBe("paused");
  } finally {
    stop();
    events.mockRestore();
  }
});
