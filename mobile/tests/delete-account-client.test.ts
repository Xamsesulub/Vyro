import type { Session } from "@supabase/supabase-js";
import { deleteOwnAccount } from "../src/features/auth/deleteAccount";
import { appPersistence, useAppStore } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useRouteLibrary } from "../src/stores/useRouteLibrary";
import { useSocialStore } from "../src/stores/useSocialStore";
import type { Workout } from "../src/features/activities/model";

const mockInvoke = jest.fn();
const mockSignOut = jest.fn();
const mockForget = jest.fn();
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
jest.mock("../src/features/social/api", () => ({
  client: () => ({
    functions: { invoke: mockInvoke },
    auth: { signOut: mockSignOut },
  }),
}));
jest.mock("../src/features/backup/sync", () => ({ cancelBackup: jest.fn() }));
jest.mock("../src/features/backup/vault", () => ({
  forgetVaultKey: (...args: unknown[]) => mockForget(...args),
}));
const session = (id: string) => ({ user: { id } }) as Session;
const workout = (ownerId: string): Workout => ({
  id: ownerId,
  ownerId,
  title: "Private",
  notes: "Note",
  source: "timer",
  visibility: "private",
  sport: "Yoga",
  seconds: 60,
  distance: 0,
  date: "2026-10-28T12:00:00Z",
  route: [],
});
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ ready: true, session: session("a") });
  useAppStore.setState({
    ready: true,
    recording: { ...useAppStore.getState().recording, status: "idle" },
    storageError: null,
    workouts: [workout("a"), workout("b")],
    backupOwners: ["a", "b"],
    watchOwners: ["a", "b"],
    backupReceipts: { "a:one": "encrypted:a", "b:two": "encrypted:b" },
    hiddenBackups: ["a:one", "b:two"],
    watchReceipts: ["a:one", "b:two"],
  });
  useRouteLibrary.setState({ entries: [] });
  useSocialStore.setState({ posts: [], comments: [], likes: [], reposts: [] });
  mockInvoke.mockResolvedValue({ data: { code: "deleted" } });
  mockSignOut.mockResolvedValue({ error: null });
  mockForget.mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

test("confirmed deletion clears only its owner's records and signs out locally", async () => {
  expect(await deleteOwnAccount("a")).toEqual({ localCleanupComplete: true });
  expect(mockInvoke).toHaveBeenCalledWith("delete-account", {
    body: { confirmation: "SLETT" },
  });
  expect(useAppStore.getState().workouts.map((w) => w.ownerId)).toEqual(["b"]);
  expect(useAppStore.getState().backupReceipts).toEqual({
    "b:two": "encrypted:b",
  });
  expect(useAppStore.getState().backupOwners).toEqual(["b"]);
  expect(useAppStore.getState().watchReceipts).toEqual(["b:two"]);
  expect(mockForget).toHaveBeenCalledWith("a");
  expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  expect(useAuthStore.getState().session).toBeNull();
});
test("a newly signed-in account is never signed out by a late deletion response", async () => {
  mockInvoke.mockImplementation(async () => {
    useAuthStore.setState({ session: session("b") });
    return { data: { code: "deleted" } };
  });
  await deleteOwnAccount("a");
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(useAuthStore.getState().session?.user.id).toBe("b");
  expect(useAppStore.getState().workouts.map((w) => w.ownerId)).toEqual(["b"]);
});
test("an unconfirmed server response never erases local workouts or the recovery key", async () => {
  mockInvoke.mockResolvedValue({
    error: { context: { json: async () => ({ code: "retry_cleanup" }) } },
  });
  await expect(deleteOwnAccount("a")).rejects.toThrow("ikke bekreftet");
  expect(useAppStore.getState().workouts).toHaveLength(2);
  expect(mockForget).not.toHaveBeenCalled();
});
test("recent login failure directs the user to sign in without clearing data", async () => {
  mockInvoke.mockResolvedValue({
    error: { context: { json: async () => ({ code: "recent_login" }) } },
  });
  await expect(deleteOwnAccount("a")).rejects.toThrow("15 minutter");
  expect(useAppStore.getState().workouts).toHaveLength(2);
});
test("local persistence failure reports partial cleanup after confirmed cloud deletion", async () => {
  jest.spyOn(appPersistence, "flush").mockRejectedValue(new Error("Disk full"));
  expect(await deleteOwnAccount("a")).toEqual({ localCleanupComplete: false });
  expect(mockForget).not.toHaveBeenCalled();
  expect(useAuthStore.getState().session).toBeNull();
});
test("another owner and an active workout cannot initiate account deletion", async () => {
  await expect(deleteOwnAccount("b")).rejects.toThrow();
  useAppStore.setState((s) => ({
    recording: { ...s.recording, status: "recording" },
  }));
  await expect(deleteOwnAccount("a")).rejects.toThrow("Avslutt");
  expect(mockInvoke).not.toHaveBeenCalled();
});
