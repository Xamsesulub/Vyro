import { AppState } from "react-native";
import { useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useTrackingStatus } from "../../stores/useTrackingStatus";
import { createWorkoutActivityController } from "./liveActivityController";
import {
  liveActivitySupported,
  workoutMapModule,
} from "./liveActivitySupport.ios";

export function observeWorkoutActivity() {
  if (!liveActivitySupported || !workoutMapModule) return () => {};
  const native = workoutMapModule;
  // Synchronous lazy import keeps missing widget modules out of Expo Go startup.
  let factory: typeof import("./WorkoutActivity.ios").default;
  try {
    // Expo Go has no WidgetKit native module; import only after capability check.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    factory = require("./WorkoutActivity.ios").default;
  } catch {
    useTrackingStatus.setState({
      liveActivityError: "Låseskjermvisningen kunne ikke åpnes i dette bygget.",
    });
    return () => {};
  }
  const controller = createWorkoutActivityController(
    () => {
      const s = useAppStore.getState();
      return {
        ready: s.ready && useAuthStore.getState().ready,
        enabled: s.workoutLiveActivity && s.backgroundRecording,
        foreground: AppState.currentState === "active",
        userId: useAuthStore.getState().session?.user.id,
        recording: s.recording,
      };
    },
    {
      instances: () => factory.getInstances(),
      start: (props, staleDate) => {
        if (!native.activitiesEnabled())
          throw new Error("Live Activities disabled");
        return factory.start(props, "vyro://track", staleDate);
      },
      renderMap: (route) =>
        native.snapshot(
          route.map((s) => s.map((p) => [p.latitude, p.longitude])),
        ),
      clearMaps: () => native.clear(),
      error: (liveActivityError) =>
        useTrackingStatus.setState({ liveActivityError }),
    },
  );
  const request = () => {
    void controller.request();
  };
  const app = useAppStore.subscribe((state, previous) => {
    // Only a change after hydration can explicitly restore a paused display.
    // Loading saved preferences at startup must not revive an old activity.
    void controller.request(
      state.ready &&
        previous.ready &&
        state.workoutLiveActivity &&
        !previous.workoutLiveActivity,
    );
  });
  const auth = useAuthStore.subscribe(request);
  const foreground = AppState.addEventListener("change", request);
  // Background location batches also update the store and refresh the activity;
  // a JS interval alone is never relied upon while the phone is locked.
  const timer = setInterval(request, 15000);
  request();
  return () => {
    app();
    auth();
    foreground.remove();
    clearInterval(timer);
    void controller.dispose();
  };
}
