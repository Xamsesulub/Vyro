import { act, render } from "@testing-library/react-native";
import type { Session } from "@supabase/supabase-js";
import { WorkoutAwake } from "../src/components/WorkoutAwake";
import { useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import { initialRecording } from "../src/features/tracking/simulator";
const mockActivate = jest.fn();
const mockRelease = jest.fn();
let mockPath = "/track";
jest.mock("expo-router", () => ({ usePathname: () => mockPath }));
jest.mock("expo-keep-awake", () => ({
  useKeepAwake: () =>
    jest.requireActual<typeof import("react")>("react").useEffect(() => {
      mockActivate();
      return mockRelease;
    }, []),
}));
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));

test("only an active or paused workout map keeps awake; leaving, finishing and disabling release it", async () => {
  useAuthStore.setState({ session: { user: { id: "a" } } as Session });
  useAppStore.setState({
    keepWorkoutAwake: true,
    recording: { ...initialRecording, ownerId: "a" },
  });
  const result = await render(<WorkoutAwake />);
  expect(mockActivate).not.toHaveBeenCalled();
  await act(() =>
    useAppStore.setState({
      recording: { ...initialRecording, ownerId: "a", status: "recording" },
    }),
  );
  expect(mockActivate).toHaveBeenCalledTimes(1);
  await act(() =>
    useAppStore.setState({
      recording: { ...useAppStore.getState().recording, status: "paused" },
    }),
  );
  expect(mockRelease).not.toHaveBeenCalled();
  mockPath = "/profile";
  await result.rerender(<WorkoutAwake />);
  expect(mockRelease).toHaveBeenCalledTimes(1);
  mockPath = "/map";
  await result.rerender(<WorkoutAwake />);
  expect(mockActivate).toHaveBeenCalledTimes(2);
  await act(() => useAppStore.setState({ keepWorkoutAwake: false }));
  expect(mockRelease).toHaveBeenCalledTimes(2);
  await act(() => useAppStore.setState({ keepWorkoutAwake: true }));
  await act(() =>
    useAppStore.setState({
      recording: { ...useAppStore.getState().recording, status: "finishing" },
    }),
  );
  expect(mockRelease).toHaveBeenCalledTimes(3);
  await act(() =>
    useAppStore.setState({
      recording: { ...initialRecording, status: "recording", ownerId: "b" },
    }),
  );
  expect(mockActivate).toHaveBeenCalledTimes(3);
});
