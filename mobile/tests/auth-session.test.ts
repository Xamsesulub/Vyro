import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
jest.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));
jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "vyro://auth/callback"),
}));
import { supabase } from "../src/lib/supabase";
import {
  acceptAuthSession,
  observeAuth,
  retryAuthInitialization,
  useAuthStore,
} from "../src/stores/useAuthStore";
import {
  completeAuthCode,
  completeTokenLink,
  authFragment,
} from "../src/features/auth/links";

const auth = supabase!.auth;
test("older email fragments are verified by Auth and rejected tokens never create a session", async () => {
  const link = authFragment(
    "vyro://auth/callback#access_token=access&refresh_token=refresh&type=signup",
  );
  expect(link).toMatchObject({
    accessToken: "access",
    refreshToken: "refresh",
    type: "signup",
  });
  (auth.setSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: { code: "bad_jwt" },
  });
  await expect(
    completeTokenLink(link.accessToken, link.refreshToken),
  ).rejects.toMatchObject({ code: "bad_jwt" });
  expect(auth.setSession).toHaveBeenCalledWith({
    access_token: "access",
    refresh_token: "refresh",
  });
  expect(useAuthStore.getState().session).toBeNull();
});
let callback: (event: AuthChangeEvent, session: Session | null) => void;
const unsubscribe = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (auth.onAuthStateChange as jest.Mock).mockImplementation((listener) => {
    callback = listener;
    return { data: { subscription: { unsubscribe } } };
  });
  useAuthStore.setState({
    ready: false,
    session: null,
    initializationSlow: false,
    confirmationEmail: null,
  });
});
test("slow initialization remains unresolved instead of claiming logout; late recovery still works", async () => {
  jest.useFakeTimers();
  const cleanup = observeAuth();
  await jest.advanceTimersByTimeAsync(8_000);
  expect(useAuthStore.getState()).toMatchObject({
    ready: false,
    session: null,
    initializationSlow: true,
  });
  const session = { user: { id: "test-user" } } as Session;
  callback("SIGNED_IN", session);
  expect(useAuthStore.getState()).toMatchObject({
    session,
    initializationSlow: false,
  });
  callback("SIGNED_OUT", null);
  expect(useAuthStore.getState().session).toBeNull();
  cleanup?.();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});
test("one-time link exchanges are deduplicated and recovery follows the SDK event", async () => {
  let resolve!: (result: unknown) => void;
  (auth.exchangeCodeForSession as jest.Mock).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const first = completeAuthCode("test-code");
  const second = completeAuthCode("test-code");
  expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  callback("PASSWORD_RECOVERY", { user: { id: "test-user" } } as Session);
  resolve({ data: { session: { user: { id: "test-user" } } }, error: null });
  await expect(first).resolves.toEqual({ recovery: true });
  await expect(second).resolves.toEqual({ recovery: true });
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});
test("a failed link cannot be mistaken for a session", async () => {
  (auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: { code: "flow_state_expired" },
  });
  await expect(completeAuthCode("expired-code")).rejects.toMatchObject({
    code: "flow_state_expired",
  });
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test("a confirmed email session reaches every screen before navigation, even without an SDK event", async () => {
  const session = { user: { id: "confirmed-runner" } } as Session;
  useAuthStore.setState({ confirmationEmail: "runner@example.com" });
  (auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
    data: { session },
    error: null,
  });
  await completeAuthCode("confirmed-code");
  expect(useAuthStore.getState()).toMatchObject({
    session,
    ready: true,
    confirmationEmail: null,
  });
});

test("an unsubscribed observer cannot clear a newer login", () => {
  const cleanup = observeAuth();
  cleanup?.();
  const session = { user: { id: "new-login" } } as Session;
  useAuthStore.setState({ session, ready: true });
  callback("INITIAL_SESSION", null);
  expect(useAuthStore.getState().session).toBe(session);
});

test("a late initial snapshot cannot overwrite a successful sign-in", () => {
  const cleanup = observeAuth();
  const session = { user: { id: "new-login" } } as Session;
  acceptAuthSession(session);
  callback("INITIAL_SESSION", null);
  expect(useAuthStore.getState()).toMatchObject({ session, ready: true });
  callback("SIGNED_OUT", null);
  expect(useAuthStore.getState().session).toBeNull();
  cleanup?.();
});

test("a late initial snapshot cannot resurrect a signed-out account", () => {
  const cleanup = observeAuth();
  callback("SIGNED_OUT", null);
  callback("INITIAL_SESSION", { user: { id: "old-login" } } as Session);
  expect(useAuthStore.getState().session).toBeNull();
  cleanup?.();
});

test("recovery retries are shared and cannot override a newer account", async () => {
  let finish!: (value: unknown) => void;
  (auth.getSession as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = retryAuthInitialization();
  const second = retryAuthInitialization();
  expect(auth.getSession).toHaveBeenCalledTimes(1);
  const session = { user: { id: "new-account" } } as Session;
  acceptAuthSession(session);
  finish({ data: { session: null }, error: null });
  await Promise.all([first, second]);
  expect(useAuthStore.getState().session).toBe(session);
});

test("a failed recovery keeps auth unresolved; a successful retry can confirm a guest", async () => {
  (auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: new Error("offline"),
  });
  await retryAuthInitialization();
  expect(useAuthStore.getState()).toMatchObject({
    ready: false,
    initializationSlow: true,
  });
  (auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: null,
  });
  await retryAuthInitialization();
  expect(useAuthStore.getState()).toMatchObject({
    ready: true,
    session: null,
    initializationSlow: false,
  });
});

test("an empty SDK initial event after a failed refresh does not pretend the user logged out", async () => {
  jest.useFakeTimers();
  (auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: new Error("refresh unavailable"),
  });
  const cleanup = observeAuth();
  callback("INITIAL_SESSION", null);
  await jest.advanceTimersByTimeAsync(1);
  expect(useAuthStore.getState()).toMatchObject({
    ready: false,
    initializationSlow: true,
  });
  cleanup?.();
  jest.useRealTimers();
});

test("an empty initial snapshot is confirmed as a guest without holding the SDK callback lock", async () => {
  jest.useFakeTimers();
  (auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: null,
  });
  const cleanup = observeAuth();
  callback("INITIAL_SESSION", null);
  expect(auth.getSession).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(useAuthStore.getState()).toMatchObject({
    ready: true,
    session: null,
    initializationSlow: false,
  });
  cleanup?.();
  jest.useRealTimers();
});
