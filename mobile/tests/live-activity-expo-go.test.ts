import { observeWorkoutActivity } from "../src/features/tracking/liveActivity.ios";

jest.mock("../src/features/tracking/liveActivitySupport.ios", () => ({
  liveActivitySupported: false,
  workoutMapModule: null,
}));
jest.mock("../src/features/tracking/WorkoutActivity.ios", () => {
  throw new Error("Expo Go must not load ExpoWidgets/ExpoUI");
});
jest.mock("../src/stores/useAppStore", () => ({ useAppStore: {} }));
jest.mock("../src/stores/useAuthStore", () => ({ useAuthStore: {} }));

test("Expo Go and old iOS binaries skip all optional WidgetKit imports", () => {
  expect(() => observeWorkoutActivity()()).not.toThrow();
});
