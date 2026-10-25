import { requireOptionalNativeModule } from "expo";
import type { WatchNative } from "./native";
export type { WatchNative, WatchConnection } from "./native";
// Expo Go and existing iPhone builds keep working without the new module.
export const watchNative =
  requireOptionalNativeModule<WatchNative>("VyroWatch");
