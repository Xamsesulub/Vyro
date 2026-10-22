import type { Session } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/useAuthStore";
import {
  loadOwnProfile,
  saveDisplayName,
  useProfileStore,
} from "../src/stores/useProfileStore";

jest.mock("../src/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
const profile = { id: "a", username: "runner_a", display_name: "Ada" };
const session = (id: string) => ({ user: { id } }) as Session;
function query() {
  const q = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: profile, error: null }),
  };
  jest.mocked(supabase!.from).mockReturnValue(q as never);
  return q;
}
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ session: session("a") });
  useProfileStore.setState({ profile: null, loadedAt: 0, errorFor: null });
});
test("saves the trimmed name to the current owner's RLS-protected profile and updates the cache", async () => {
  const q = query();
  await saveDisplayName("a", " Ada ");
  expect(q.update).toHaveBeenCalledWith({ display_name: "Ada" });
  expect(q.eq).toHaveBeenCalledWith("id", "a");
  expect(useProfileStore.getState().profile).toEqual(profile);
  await loadOwnProfile("a", new AbortController().signal);
  expect(q.single).toHaveBeenCalledTimes(1);
});
test("rejects another owner, an empty name and failed writes without replacing the profile", async () => {
  const q = query();
  await expect(saveDisplayName("b", "Name")).rejects.toThrow();
  await expect(saveDisplayName("a", "  ")).rejects.toThrow();
  expect(q.update).not.toHaveBeenCalled();
  useProfileStore.setState({ profile });
  q.single.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
  await expect(saveDisplayName("a", "New")).rejects.toThrow();
  expect(useProfileStore.getState().profile).toEqual(profile);
});
test("a late fetch cannot undo a successful edit", async () => {
  const q = query();
  let resolve!: (value: unknown) => void;
  q.single.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const loading = loadOwnProfile("a", new AbortController().signal);
  await saveDisplayName("a", "Ada");
  resolve({ data: { ...profile, display_name: "Old" }, error: null });
  await loading;
  expect(useProfileStore.getState().profile?.display_name).toBe("Ada");
});
test("account switching clears the cache and discards late writes from the old account", async () => {
  const q = query();
  useProfileStore.setState({ profile });
  let resolve!: (value: unknown) => void;
  q.single.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const saving = saveDisplayName("a", "Ada");
  useAuthStore.setState({ session: session("b") });
  expect(useProfileStore.getState().profile).toBeNull();
  resolve({ data: profile, error: null });
  await expect(saving).rejects.toThrow();
  expect(useProfileStore.getState().profile).toBeNull();
});
test("cancelled requests never replace the current profile", async () => {
  query();
  const controller = new AbortController();
  const loading = loadOwnProfile("a", controller.signal);
  controller.abort();
  await loading;
  expect(useProfileStore.getState().profile).toBeNull();
});
