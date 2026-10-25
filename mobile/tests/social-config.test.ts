jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "standalone" },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
jest.mock("../src/lib/supabase", () => ({ supabaseConfigured: true }));

const originalGoogle = process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED;
const originalApple = process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED;
afterEach(() => {
  if (originalGoogle === undefined)
    delete process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED;
  else process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED = originalGoogle;
  if (originalApple === undefined)
    delete process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED;
  else process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED = originalApple;
});

test.each([
  ["ios", "standalone", undefined, undefined, false, false],
  ["ios", "standalone", "true", "true", true, true],
  ["ios", "standalone", "true", "false", false, false],
  ["ios", "storeClient", "true", "true", false, false],
  ["web", "storeClient", "true", "false", true, false],
  ["web", "standalone", "false", "true", false, true],
])(
  "provider visibility on %s/%s with Google=%s and Apple=%s",
  (os, environment, google, apple, expectedGoogle, expectedApple) => {
    jest.resetModules();
    require("react-native").Platform.OS = os;
    require("expo-constants").default.executionEnvironment = environment;
    if (google === undefined)
      delete process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED;
    else process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED = google;
    if (apple === undefined) delete process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED;
    else process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED = apple;
    const {
      visibleSocialProviders,
    } = require("../src/features/auth/socialConfig");
    expect(visibleSocialProviders(true)).toEqual({
      google: expectedGoogle,
      apple: expectedApple,
    });
  },
);
