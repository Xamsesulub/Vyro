import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { supabaseConfigured } from "../../lib/supabase";

export type SocialProvider = "google" | "apple";

// Google was configured and verified in VYRO's existing Supabase project.
// Keep that product default in Git, not only in one PC's ignored .env.local.
// An explicit false remains available for environments without Google setup.
const googleEnabled = process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED !== "false";
// Expo Go has a different app identity/redirect and is not our OAuth client.
const expoGo =
  Platform.OS !== "web" &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const supported = Platform.OS === "web" || (Platform.OS === "ios" && !expoGo);
export const googleNeedsOwnBuild =
  supabaseConfigured && googleEnabled && expoGo;
export const socialConfig = {
  google: supabaseConfigured && supported && googleEnabled,
  apple:
    supabaseConfigured &&
    supported &&
    process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === "true",
};

export function visibleSocialProviders(appleAvailable: boolean) {
  const apple = socialConfig.apple && appleAvailable;
  return {
    apple,
    // Each provider has its own readiness. Pending Apple setup must not hide
    // the already configured Google sign-in/registration flow.
    google: socialConfig.google,
  };
}
