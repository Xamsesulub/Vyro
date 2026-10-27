import type { Session } from "@supabase/supabase-js";
import { syncWatch, useWatchStatus } from "../src/features/watch/sync";
import { watchNative } from "../src/features/watch/native";
import { useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: jest.requireMock("@react-native-async-storage/async-storage"),
}));
jest.mock("../src/features/watch/native", () => ({
  watchNative: {
    status: jest.fn(),
    setOwner: jest.fn(async () => {}),
    pending: jest.fn(async () => []),
    acknowledge: jest.fn(),
    addListener: jest.fn(),
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "a" } } as Session,
  });
  useAppStore.setState({ ready: true, watchOwners: ["a"] });
});
test.each([
  { paired: false, installed: false },
  { paired: true, installed: false },
])(
  "missing watch/app reports connection without attempting transfer: %j",
  async (connection) => {
    jest
      .mocked(watchNative!.status)
      .mockResolvedValue({ ...connection, reachable: false });
    useWatchStatus.setState({ error: "previous error" });
    await syncWatch();
    expect(watchNative!.setOwner).not.toHaveBeenCalled();
    expect(watchNative!.pending).not.toHaveBeenCalled();
    expect(useWatchStatus.getState()).toMatchObject({
      ...connection,
      busy: false,
      error: null,
    });
  },
);
test("an installed paired watch can sync even when not currently reachable", async () => {
  jest
    .mocked(watchNative!.status)
    .mockResolvedValue({ paired: true, installed: true, reachable: false });
  await syncWatch();
  expect(watchNative!.setOwner).toHaveBeenCalledWith("a");
  expect(watchNative!.pending).toHaveBeenCalledWith("a");
  expect(useWatchStatus.getState()).toMatchObject({ busy: false, error: null });
});
