import { act, render, waitFor } from "@testing-library/react-native";
import NotificationObserver from "../src/components/NotificationObserver";

let mockOwner = "alex";
let mockResponse: (value: unknown) => void;
const mockPush = jest.fn();
const mockTarget = jest.fn();
const mockClear = jest.fn().mockResolvedValue(undefined);
const noticeId = "11111111-1111-4111-8111-111111111111";
const postId = "22222222-2222-4222-8222-222222222222";
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock("../src/stores/useAuthStore", () => ({
  useAuthStore: Object.assign(
    (selector: (state: unknown) => unknown) => selector({ session: { user: { id: mockOwner } } }),
    { getState: () => ({ session: { user: { id: mockOwner } } }) },
  ),
}));
jest.mock("../src/features/social/push", () => ({
  pushSupported: true,
  pushPreference: async () => false,
  enablePush: jest.fn(),
  isOwnNotification: (data: { recipientId?: string }, owner: string) => data.recipientId === owner,
}));
jest.mock("../src/features/social/notificationTarget", () => ({
  isNotificationId: (value: unknown) => value === "11111111-1111-4111-8111-111111111111",
  loadNotificationTarget: (...args: unknown[]) => mockTarget(...args),
}));
jest.mock("../src/features/social/notificationRuntime", () => ({
  loadNotifications: async () => ({
    DEFAULT_ACTION_IDENTIFIER: "default",
    setNotificationHandler: jest.fn(),
    addNotificationResponseReceivedListener: (callback: typeof mockResponse) => {
      mockResponse = callback;
      return { remove: jest.fn() };
    },
    addPushTokenListener: () => ({ remove: jest.fn() }),
    getLastNotificationResponse: () => null,
    clearLastNotificationResponseAsync: () => mockClear(),
  }),
}));
beforeEach(() => {
  mockOwner = "alex";
  mockPush.mockReset();
  mockTarget.mockReset().mockResolvedValue({ postId, type: "workout", comments: true });
});
async function mountAndOpen(identifier: string, recipientId = "alex") {
  await render(<NotificationObserver />);
  await act(async () => {
    mockResponse({
      actionIdentifier: "default",
      notification: { request: { identifier, content: { data: { recipientId, notificationId: noticeId } } } },
    });
  });
}
test("a comment push opens the server-authorized post with comments expanded", async () => {
  await mountAndOpen("comment-1");
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith({
    pathname: "/social-post", params: { id: postId, type: "workout", comments: "1" },
  }));
  expect(mockTarget).toHaveBeenCalledWith("alex", noticeId);
});
test("a notification for another signed-in account cannot resolve or open a post", async () => {
  await mountAndOpen("other-account", "mina");
  expect(mockTarget).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});
test("switching accounts while a post is resolving prevents stale navigation", async () => {
  let finish!: (value: unknown) => void;
  mockTarget.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await mountAndOpen("account-race");
  mockOwner = "mina";
  await act(async () => finish({ postId, type: "workout", comments: true }));
  expect(mockPush).not.toHaveBeenCalled();
});
test("a deleted or no-longer-shared source falls back to the inbox", async () => {
  mockTarget.mockResolvedValue(null);
  await mountAndOpen("deleted-source");
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/notifications"));
});
test("a failed target lookup still opens a usable inbox", async () => {
  mockTarget.mockRejectedValue(new Error("offline"));
  await mountAndOpen("offline-target");
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/notifications"));
});
