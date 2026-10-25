import type { Session } from "@supabase/supabase-js";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Home from "../src/app/(tabs)/index";
import { useAuthStore } from "../src/stores/useAuthStore";
import { loadHomeFeed } from "../src/features/social/homeFeed";
import type { HomePost } from "../src/features/social/homeFeed";

jest.mock("expo-router", () => ({
  router: { prefetch: jest.fn(), push: jest.fn() },
  useFocusEffect: (cb: () => void) =>
    jest.requireActual("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
}));
jest.mock("../src/features/social/homeFeed", () => ({
  loadHomeFeed: jest.fn(),
}));
jest.mock("../src/features/auth/useOwnProfile", () => ({
  useOwnProfile: () => ({ profile: null }),
}));
jest.mock("../src/components/TurfEvents", () => ({ TurfEvents: () => null }));
jest.mock("../src/components/CloudPost", () => ({
  CloudPost: ({ post }: { post: HomePost }) =>
    jest
      .requireActual("react")
      .createElement(jest.requireActual("react-native").Text, null, post.id),
}));
jest.mock("../src/components/TrainingProgress", () => ({
  trainingTime: () => "0 min",
}));
jest.mock("../src/stores/useAppStore", () => ({
  useAppStore: (select: (s: unknown) => unknown) =>
    select({ theme: "light", workouts: [], homeFeed: "following" }),
}));
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { View, Text, Pressable } = jest.requireActual("react-native");
  return {
    Screen: View,
    Txt: Text,
    Icon: () => null,
    Logo: () => null,
    Chip: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress },
        React.createElement(Text, null, title),
      ),
    styles: { row: {} },
    useTheme: () => ({ border: "#ddd", text: "#111", muted: "#555" }),
    Button: ({
      title,
      disabled,
      onPress,
    }: {
      title: string;
      disabled?: boolean;
      onPress: () => void;
    }) =>
      React.createElement(
        Pressable,
        {
          onPress,
          accessibilityRole: "button",
          accessibilityLabel: title,
          accessibilityState: { disabled },
        },
        React.createElement(Text, null, title),
      ),
  };
});
const feed = jest.mocked(loadHomeFeed);
const page = (id: string) => ({ posts: [{ id } as HomePost], next: null });
const deferred = () => {
  let resolve!: (v: ReturnType<typeof page>) => void;
  const promise = new Promise<ReturnType<typeof page>>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "a" } } as Session,
  });
});
test("refresh keeps visible posts and a failed refresh is retryable", async () => {
  feed.mockResolvedValueOnce(page("existing-post"));
  await render(<Home />);
  expect(screen.getByText("existing-post")).toBeTruthy();
  const pending = deferred();
  feed.mockReturnValueOnce(pending.promise);
  await fireEvent.press(
    screen.getByRole("button", { name: "Oppdater strømmen" }),
  );
  expect(screen.getByText("existing-post")).toBeTruthy();
  await act(() => pending.resolve(page("fresh-post")));
  expect(screen.queryByText("existing-post")).toBeNull();
  expect(screen.getByText("fresh-post")).toBeTruthy();
  feed.mockRejectedValueOnce(new Error("offline"));
  await fireEvent.press(
    screen.getByRole("button", { name: "Oppdater strømmen" }),
  );
  expect(screen.getByText("fresh-post")).toBeTruthy();
  feed.mockResolvedValueOnce(page("retried-post"));
  await fireEvent.press(screen.getByRole("button", { name: "Prøv igjen" }));
  expect(screen.getByText("retried-post")).toBeTruthy();
});
test("switching accounts aborts a late response and never exposes the old feed", async () => {
  const old = deferred();
  feed.mockReturnValueOnce(old.promise);
  await render(<Home />);
  const oldSignal = feed.mock.calls[0][3];
  feed.mockResolvedValueOnce(page("account-b-post"));
  await act(() =>
    useAuthStore.setState({ session: { user: { id: "b" } } as Session }),
  );
  expect(oldSignal.aborted).toBe(true);
  await act(() => old.resolve(page("account-a-private-post")));
  expect(screen.queryByText("account-a-private-post")).toBeNull();
  expect(screen.getByText("account-b-post")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Kom i gang" })).toBeNull();
});
test("changing feed tabs cancels the old request and the private log makes no feed request", async () => {
  const old = deferred();
  feed.mockReturnValueOnce(old.promise);
  await render(<Home />);
  const oldSignal = feed.mock.calls[0][3];
  feed.mockResolvedValueOnce(page("reposted-post"));
  await fireEvent.press(screen.getByText("Delt på nytt"));
  expect(feed.mock.calls[1][1]).toBe("reposted");
  expect(oldSignal.aborted).toBe(true);
  await act(() => old.resolve(page("following-post")));
  expect(screen.queryByText("following-post")).toBeNull();
  expect(screen.getByText("reposted-post")).toBeTruthy();
  await fireEvent.press(screen.getByText("Mine økter"));
  expect(feed).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("reposted-post")).toBeNull();
  expect(screen.getByText("Ta vare på din første tur.")).toBeTruthy();
});
