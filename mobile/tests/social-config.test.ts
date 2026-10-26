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
  ["ios", "standalone", undefined, undefined, true, false],
  ["web", "standalone", undefined, undefined, true, false],
  ["ios", "standalone", "false", "true", false, true],
  ["ios", "standalone", "true", "true", true, true],
  ["ios", "standalone", "true", "false", true, false],
  ["ios", "storeClient", undefined, undefined, false, false],
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

test("Google remains available when Apple availability fails", () => {
  jest.resetModules();
  require("react-native").Platform.OS = "ios";
  require("expo-constants").default.executionEnvironment = "standalone";
  delete process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED;
  process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED = "true";
  const {
    visibleSocialProviders,
  } = require("../src/features/auth/socialConfig");
  expect(visibleSocialProviders(false)).toEqual({ google: true, apple: false });
});

test("Expo Go explains the missing Google option; a configured web/native app does not", () => {
  jest.resetModules();
  require("react-native").Platform.OS = "ios";
  require("expo-constants").default.executionEnvironment = "storeClient";
  delete process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED;
  expect(require("../src/features/auth/socialConfig").googleNeedsOwnBuild).toBe(
    true,
  );
});

test("missing Supabase configuration still prevents an unusable Google button", () => {
  jest.resetModules();
  require("react-native").Platform.OS = "web";
  require("../src/lib/supabase").supabaseConfigured = false;
  delete process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED;
  const {
    visibleSocialProviders,
  } = require("../src/features/auth/socialConfig");
  expect(visibleSocialProviders(true)).toEqual({ google: false, apple: false });
});
