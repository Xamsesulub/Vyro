import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  enablePush,
  disablePush,
  isOwnNotification,
} from "../src/features/social/push";

let mockOwner = "owner";
const mockRpc = jest.fn();
const mockPermissions = jest.fn();
const mockRequest = jest.fn();
const mockToken = jest.fn();
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    executionEnvironment: "standalone",
    easConfig: { projectId: "project" },
  },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "installation" }));
jest.mock("../src/features/social/notificationRuntime", () => ({
  loadNotifications: async () => ({
    getPermissionsAsync: () => mockPermissions(),
    requestPermissionsAsync: () => mockRequest(),
    getExpoPushTokenAsync: (v: unknown) => mockToken(v),
  }),
}));
jest.mock("../src/features/social/api", () => ({
  client: () => ({ rpc: mockRpc }),
}));
jest.mock("../src/features/social/profiles", () => ({
  requireOwner: (id: string) => {
    if (id !== mockOwner) throw Error("Changed account");
  },
}));
beforeEach(async () => {
  mockOwner = "owner";
  mockRpc.mockReset();
  mockPermissions.mockReset();
  mockRequest.mockReset();
  mockToken.mockReset();
  await AsyncStorage.clear();
  mockPermissions.mockResolvedValue({ granted: true });
  mockToken.mockResolvedValue({ data: "ExpoPushToken[test]" });
  mockRpc.mockImplementation(() => ({
    abortSignal: () => Promise.resolve({ error: null }),
  }));
});
test("permission refusal never registers a device", async () => {
  mockPermissions.mockResolvedValue({ granted: false });
  mockRequest.mockResolvedValue({ granted: false });
  await expect(enablePush("owner")).rejects.toThrow("Tillat varsler");
  expect(mockRpc).not.toHaveBeenCalled();
});
test("account switch during token lookup cannot register the old account", async () => {
  mockToken.mockImplementation(async () => {
    mockOwner = "other";
    return { data: "ExpoPushToken[test]" };
  });
  await expect(enablePush("owner")).rejects.toThrow("Changed account");
  expect(mockRpc).not.toHaveBeenCalled();
});
test("a queued explicit opt-out wins over an in-flight refresh", async () => {
  await AsyncStorage.setItem("vyro-push-opt-in:owner", "true");
  let release!: (v: { data: string }) => void;
  mockToken.mockReturnValue(
    new Promise((r) => {
      release = r;
    }),
  );
  const enable = enablePush("owner", false);
  const disable = disablePush("owner");
  for (let i = 0; i < 15 && !mockToken.mock.calls.length; i++)
    await Promise.resolve();
  release({ data: "ExpoPushToken[test]" });
  await Promise.all([enable, disable]);
  expect(mockRpc.mock.calls.map((c) => c[0])).toEqual([
    "vyro_register_push",
    "vyro_disable_push",
  ]);
  expect(await AsyncStorage.getItem("vyro-push-opt-in:owner")).toBe("false");
  await enablePush("owner", false);
  expect(mockRpc).toHaveBeenCalledTimes(2);
});
test("failed registration does not claim successful opt-in", async () => {
  mockRpc.mockReturnValue({
    abortSignal: () => Promise.resolve({ error: new Error("offline") }),
  });
  await expect(enablePush("owner")).rejects.toThrow("offline");
  expect(await AsyncStorage.getItem("vyro-push-opt-in:owner")).not.toBe("true");
});
test("notification navigation only accepts the current account and known screen", () => {
  expect(
    isOwnNotification(
      { screen: "notifications", recipientId: "owner" },
      "owner",
    ),
  ).toBe(true);
  expect(
    isOwnNotification(
      { screen: "notifications", recipientId: "other" },
      "owner",
    ),
  ).toBe(false);
  expect(
    isOwnNotification(
      { screen: "https://bad.test", recipientId: "owner" },
      "owner",
    ),
  ).toBe(false);
  expect(
    isOwnNotification({ screen: "notifications", recipientId: "owner" }),
  ).toBe(false);
});
