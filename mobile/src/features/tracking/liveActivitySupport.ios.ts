import { requireOptionalNativeModule } from "expo";

// Do not import expo-widgets / Expo UI in Expo Go: their native modules are
// absent there. Keep the foreground workout fully usable in existing builds.
export const workoutMapModule = requireOptionalNativeModule<{
  activitiesEnabled(): boolean;
  snapshot(segments: number[][][]): Promise<string | null>;
  clear(): Promise<void>;
}>("VyroWorkoutMap");
export const liveActivitySupported =
  !!workoutMapModule && !!requireOptionalNativeModule("ExpoWidgets");
