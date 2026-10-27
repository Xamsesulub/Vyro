import { act, renderHook } from "@testing-library/react-native";
import type { Session } from "@supabase/supabase-js";
import { useVisibleWorkouts } from "../src/features/activities/useVisibleWorkouts";
import type { Workout } from "../src/features/activities/model";
import { useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: jest.requireMock("@react-native-async-storage/async-storage"),
}));
test("only current-account GPS recordings appear on user screens, including after an account switch", async () => {
  const real: Workout = {
    id: "real",
    ownerId: "a",
    source: "gps",
    sport: "Fotball",
    title: "Kamp",
    distance: 1,
    seconds: 300,
    notes: "",
    date: "2026-10-27T10:00:00Z",
    visibility: "private",
  };
  const other = { ...real, id: "other", ownerId: "b" };
  useAppStore.setState({
    examplesVisible: true,
    workouts: [
      real,
      other,
      { ...real, id: "fake", source: "simulation" },
      { ...real, id: "example", source: "example" },
    ],
  });
  useAuthStore.setState({ session: { user: { id: "a" } } as Session });
  const { result } = await renderHook(() => useVisibleWorkouts());
  expect(result.current).toEqual([real]);
  await act(() =>
    useAuthStore.setState({ session: { user: { id: "b" } } as Session }),
  );
  expect(result.current).toEqual([other]);
  await act(() => useAuthStore.setState({ session: null }));
  expect(result.current).toEqual([]);
});
