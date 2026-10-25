import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { supabaseConfigured } from "../../lib/supabase";

export type SocialProvider = "google" | "apple";

// Enable only after configuring and testing the provider in Supabase.
// Expo Go has a different app identity/redirect and is not our OAuth client.
const supported =
  Platform.OS === "web" ||
  (Platform.OS === "ios" &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient);
export const socialConfig = {
  google:
    supabaseConfigured &&
    supported &&
    process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
  apple:
    supabaseConfigured &&
    supported &&
    process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === "true",
};

export function visibleSocialProviders(appleAvailable: boolean) {
  const apple = socialConfig.apple && appleAvailable;
  return {
    apple,
    // Offer Apple's equivalent sign-in option alongside Google on iPhone.
    google: socialConfig.google && (Platform.OS !== "ios" || apple),
  };
}
