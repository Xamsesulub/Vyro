import type { Session } from "@supabase/supabase-js";
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
