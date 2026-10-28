import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { CloudPost } from "../src/components/CloudPost";
import { client } from "../src/features/social/api";
import { FeedPost } from "../src/features/social/feed";
jest.mock("../src/components/LiveMap", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../src/features/social/api", () => ({
  client: jest.fn(),
  socialError: () => "Kunne ikke hente eller lagre data.",
}));
jest.mock("../src/components/WorkoutMap", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(Text, null, "Rutekart lastet"),
  };
});
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { View, Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: Text,
    styles: {},
    useTheme: () => ({}),
    Button: ({
      title,
      disabled,
      onPress,
    }: {
      title: string;
      disabled: boolean;
      onPress: () => void;
    }) =>
      React.createElement(
        Pressable,
        {
          onPress,
          disabled,
          accessibilityRole: "button",
          accessibilityLabel: title,
        },
        React.createElement(Text, null, title),
      ),
  };
});
const route = [
  { latitude: 59.9, longitude: 10.7 },
  { latitude: 59.9005, longitude: 10.7005 },
];
const post: FeedPost = {
  id: "post",
  author_id: "runner",
  title: "Løpetur",
  sport: "Løping",
  distance_km: 1,
  seconds: 300,
  recorded_at: "2026-10-23T12:00:00Z",
  created_at: "2026-10-23T12:00:00Z",
  audience: "followers",
  profiles: { id: "runner", display_name: "Løper", username: "runner" },
  like_count: 2,
  liked: false,
  reposted: false,
};
beforeEach(() => jest.clearAllMocks());
test("feed maps load automatically; reactions use the feed summary and route reads are aborted when recycled", async () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { route }, error: null }),
  };
  const from = jest.fn(() => chain);
  (client as jest.Mock).mockReturnValue({ from });
  const view = await render(
    <CloudPost post={post} userId="viewer" onRemoved={() => {}} />,
  );
  expect(screen.getByRole("button", { name: "Lik · 2" })).toBeTruthy();
  expect(await screen.findByText("Rutekart lastet")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Vis rutekart" })).toBeNull();
  expect(from).toHaveBeenCalledTimes(1);
  expect(from).toHaveBeenCalledWith("posts");
  expect(chain.select).toHaveBeenCalledWith("route,max_speed_kmh");
  await view.unmount();
  expect(chain.abortSignal.mock.calls[0][0].aborted).toBe(true);
});
test("a successful reaction updates the feed snapshot for recycled list rows, while failed writes do not", async () => {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { route }, error: null }),
  };
  (client as jest.Mock).mockReturnValue({
    from: (table: string) => (table === "posts" ? chain : { upsert }),
  });
  const changed = jest.fn();
  await render(
    <CloudPost
      post={post}
      userId="viewer"
      onRemoved={() => {}}
      onReactionsChanged={changed}
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Lik · 2" }));
  expect(changed).toHaveBeenCalledWith("post", {
    like_count: 3,
    liked: true,
    reposted: false,
  });
  expect(screen.getByRole("button", { name: "Likt · 3" })).toBeTruthy();
  changed.mockClear();
  upsert.mockResolvedValue({ error: { code: "42501" } });
  await fireEvent.press(screen.getByRole("button", { name: "Del på nytt" }));
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Del på nytt" })).toBeTruthy();
});
test("football posts automatically expose both map choices and the authorized GPS speed", async () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        route: [
          { latitude: 59.9, longitude: 10.7 },
          { latitude: 59.9005, longitude: 10.7005 },
        ],
        max_speed_kmh: "21.6",
      },
      error: null,
    }),
  };
  const from = jest.fn(() => chain);
  (client as jest.Mock).mockReturnValue({ from });
  await render(
    <CloudPost
      post={{ ...post, sport: "Fotball" }}
      userId="viewer"
      onRemoved={() => {}}
    />,
  );
  expect(await screen.findByRole("tab", { name: "Varmekart" })).toBeTruthy();
  expect(screen.getByText(/Maksfart · GPS/)).toBeTruthy();
  expect(screen.getByText(/21.6 km\/t|21,6 km\/t/)).toBeTruthy();
});

test("timer posts need no map read and generated handles stay hidden", async () => {
  const from = jest.fn();
  (client as jest.Mock).mockReturnValue({ from });
  await render(
    <CloudPost
      post={{
        ...post,
        sport: "Yoga",
        distance_km: 0,
        profiles: {
          ...post.profiles,
          username: "runner_e85ffea8a1e7416c834b2c79e9d65617",
        },
      }}
      userId="viewer"
      onRemoved={() => {}}
    />,
  );
  expect(from).not.toHaveBeenCalled();
  expect(screen.getByText("Løper")).toBeTruthy();
  expect(screen.queryByText(/runner_/)).toBeNull();
  expect(screen.queryByText("Laster kart …")).toBeNull();
});

test("a failed map read is retryable without changing reactions", async () => {
  const single = jest
    .fn()
    .mockResolvedValueOnce({ error: { code: "42501" } })
    .mockResolvedValue({ data: { route }, error: null });
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single,
  };
  (client as jest.Mock).mockReturnValue({ from: () => chain });
  await render(<CloudPost post={post} userId="viewer" onRemoved={() => {}} />);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Last kartet på nytt" }),
  );
  await waitFor(() => expect(screen.getByText("Rutekart lastet")).toBeTruthy());
  expect(screen.getByRole("button", { name: "Lik · 2" })).toBeTruthy();
  expect(single).toHaveBeenCalledTimes(2);
});
