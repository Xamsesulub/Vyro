import {
  defaultNotificationPreferences,
  loadNotificationPreferences,
  saveNotificationPreference,
} from "../src/features/social/notificationPreferences";
import {
  isNotificationId,
  loadNotificationTarget,
} from "../src/features/social/notificationTarget";

let mockOwner = "owner";
const mockQuery = jest.fn();
const mockUpsert = jest.fn();
const mockRpc = jest.fn();
jest.mock("../src/features/social/api", () => ({
  client: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ abortSignal: mockQuery }) }),
      upsert: mockUpsert,
    }),
    rpc: mockRpc,
  }),
}));
jest.mock("../src/features/social/profiles", () => ({
  requireOwner: (owner: string) => {
    if (owner !== mockOwner) throw Error("Changed account");
  },
}));
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  mockOwner = "owner";
  mockQuery.mockReset().mockResolvedValue({ data: [], error: null });
  mockUpsert.mockReset().mockReturnValue({ abortSignal: mockQuery });
  mockRpc.mockReset().mockReturnValue({ abortSignal: mockQuery });
});
test("defaults show new posts in inbox without opting into phone alerts", async () => {
  expect((await loadNotificationPreferences("owner")).posts).toEqual({
    in_app: true,
    push: false,
  });
  expect(defaultNotificationPreferences().comments).toEqual({
    in_app: true,
    push: true,
  });
});
test("saved channels override defaults independently", async () => {
  mockQuery.mockResolvedValue({
    data: [{ category: "comments", in_app: false, push: true }],
    error: null,
  });
  const preferences = await loadNotificationPreferences("owner");
  expect(preferences.comments).toEqual({ in_app: false, push: true });
  expect(preferences.likes).toEqual({ in_app: true, push: true });
});
test("saves to the signed-in account and never reports failure as success", async () => {
  mockQuery.mockResolvedValue({ error: new Error("offline") });
  await expect(
    saveNotificationPreference("owner", "likes", { in_app: true, push: false }),
  ).rejects.toThrow("offline");
  expect(mockUpsert).toHaveBeenCalledWith(
    { owner_id: "owner", category: "likes", in_app: true, push: false },
    { onConflict: "owner_id,category" },
  );
});
test("account changes invalidate pending preference and target responses", async () => {
  mockQuery.mockImplementation(async () => {
    mockOwner = "other";
    return { data: [], error: null };
  });
  await expect(loadNotificationPreferences("owner")).rejects.toThrow(
    "Changed account",
  );
  mockOwner = "owner";
  await expect(loadNotificationTarget("owner", id)).rejects.toThrow(
    "Changed account",
  );
});
test("notification target is resolved on the server, not from push-supplied URLs", async () => {
  expect(isNotificationId("https://outside.invalid")).toBe(false);
  expect(await loadNotificationTarget("owner", "../../account")).toBeNull();
  expect(mockRpc).not.toHaveBeenCalled();
  mockQuery.mockResolvedValue({
    data: { postId: id, type: "workout", comments: true, username: "alex" },
    error: null,
  });
  expect((await loadNotificationTarget("owner", id))?.comments).toBe(true);
  expect(mockRpc).toHaveBeenCalledWith("vyro_notification_target", {
    p_notice: id,
  });
});
test("deleted, unauthorized and malformed targets do not navigate", async () => {
  for (const data of [
    null,
    {
      postId: "https://bad.invalid",
      type: "workout",
      comments: false,
      username: "a",
    },
    { postId: id, type: "external", comments: false, username: "a" },
  ]) {
    mockQuery.mockResolvedValue({ data, error: null });
    expect(await loadNotificationTarget("owner", id)).toBeNull();
  }
});
