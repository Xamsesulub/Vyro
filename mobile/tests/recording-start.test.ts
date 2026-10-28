import type { Session } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { beginRecording } from "../src/features/tracking/controls";
import { requestForegroundPermission } from "../src/features/tracking/foregroundPermission";
import { initialRecording } from "../src/features/tracking/simulator";
import { useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useLocationStore } from "../src/stores/useLocationStore";
import { useTrackingStatus } from "../src/stores/useTrackingStatus";
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));
jest.mock("../src/features/tracking/foregroundPermission", () => ({
  requestForegroundPermission: jest.fn(),
}));
const granted = { granted: true, canAskAgain: true } as Awaited<
  ReturnType<typeof requestForegroundPermission>
>;
beforeEach(() => {
  AppState.currentState = "active";
  useAuthStore.setState({
    session: { user: { id: "runner" } } as Session,
    ready: true,
  });
  useAppStore.setState({
    recording: initialRecording,
    backgroundRecording: false,
    ready: true,
  });
  useTrackingStatus.setState({ starting: false, error: null });
  useLocationStore.setState({
    permission: "unknown",
    error: null,
    position: null,
  });
  jest
    .mocked(requestForegroundPermission)
    .mockReset()
    .mockResolvedValue(granted);
});

test("Start is busy before permission resolves; repeated taps start exactly one segment without a GPS fix", async () => {
  let resolve!: (value: typeof granted) => void;
  jest.mocked(requestForegroundPermission).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const first = beginRecording("start");
  expect(useTrackingStatus.getState().starting).toBe(true);
  await beginRecording("start");
  expect(requestForegroundPermission).toHaveBeenCalledTimes(1);
  expect(useAppStore.getState().recording.status).toBe("idle");
  resolve(granted);
  await first;
  expect(useTrackingStatus.getState().starting).toBe(false);
  expect(useAppStore.getState().recording.status).toBe("recording");
  expect(useAppStore.getState().recording.route).toEqual([[]]);
  expect(useAppStore.getState().recording.distance).toBe(0);
});

test("indoor time-only training starts and resumes without location permission", async () => {
  useAppStore.getState().sport("Styrketrening");
  useAppStore.setState({ backgroundRecording: true });
  await beginRecording("start");
  expect(requestForegroundPermission).not.toHaveBeenCalled();
  expect(useAppStore.getState().recording).toMatchObject({
    status: "recording",
    mode: "timer",
    ownerId: "runner",
    distance: 0,
  });
  useAppStore.getState().event("pause");
  await beginRecording("resume");
  expect(requestForegroundPermission).not.toHaveBeenCalled();
  expect(useAppStore.getState().recording.status).toBe("recording");
});

test("a timeout is visible, releases Start, and permits a successful retry", async () => {
  jest
    .mocked(requestForegroundPermission)
    .mockRejectedValueOnce(new Error("Posisjon svarte ikke."));
  await beginRecording("start");
  expect(useTrackingStatus.getState()).toMatchObject({
    starting: false,
    error: "Posisjon svarte ikke.",
  });
  expect(useAppStore.getState().recording.status).toBe("idle");
  await beginRecording("start");
  expect(useAppStore.getState().recording.status).toBe("recording");
});

test("leaving during permission cannot start GPS later after the foreground wait expires", async () => {
  jest.useFakeTimers();
  AppState.currentState = "background";
  const removed = jest.fn();
  let activate!: (state: "active") => void;
  const events = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_, listener) => {
      activate = listener;
      return { remove: removed };
    });
  try {
    const starting = beginRecording("start");
    await jest.advanceTimersByTimeAsync(15_000);
    await starting;
    expect(useAppStore.getState().recording.status).toBe("idle");
    expect(useTrackingStatus.getState().starting).toBe(false);
    expect(useTrackingStatus.getState().error).toContain("Hold VYRO åpen");
    expect(removed).toHaveBeenCalledTimes(1);
    AppState.currentState = "active";
    activate("active");
    await Promise.resolve();
    expect(useAppStore.getState().recording.status).toBe("idle");
    await beginRecording("start");
    expect(useAppStore.getState().recording.status).toBe("recording");
  } finally {
    events.mockRestore();
    AppState.currentState = "active";
    jest.useRealTimers();
  }
});

test("revoked permission on resume leaves the workout paused", async () => {
  await beginRecording("start");
  useAppStore.getState().event("pause");
  jest
    .mocked(requestForegroundPermission)
    .mockResolvedValueOnce({ ...granted, granted: false });
  await beginRecording("resume");
  expect(useAppStore.getState().recording.status).toBe("paused");
  expect(useTrackingStatus.getState().error).toContain("Tillat posisjon");
});

test("an account switch during foreground permission never starts a workout for the new user", async () => {
  let resolve!: (value: typeof granted) => void;
  jest.mocked(requestForegroundPermission).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const pending = beginRecording("start");
  useAuthStore.setState({ session: { user: { id: "other" } } as Session });
  resolve(granted);
  await pending;
  expect(useAppStore.getState().recording.status).toBe("idle");
  expect(useTrackingStatus.getState().starting).toBe(false);
});

test("simulation starts without permission or an account and remains simulation", async () => {
  useAuthStore.setState({ session: null });
  useAppStore.getState().mode("simulation");
  await beginRecording("start");
  expect(requestForegroundPermission).not.toHaveBeenCalled();
  expect(useAppStore.getState().recording).toMatchObject({
    status: "recording",
    mode: "simulation",
  });
});
