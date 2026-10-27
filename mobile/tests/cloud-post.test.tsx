import { fireEvent, render, screen } from "@testing-library/react-native";
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
test("feed summaries show reactions without extra reads; routes load only on demand and can be hidden", async () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { route: [] }, error: null }),
  };
  const from = jest.fn(() => chain);
  (client as jest.Mock).mockReturnValue({ from });
  await render(<CloudPost post={post} userId="viewer" onRemoved={() => {}} />);
  expect(screen.getByRole("button", { name: "Lik · 2" })).toBeTruthy();
  expect(from).not.toHaveBeenCalled();
  expect(screen.queryByText("Rutekart lastet")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Vis rutekart" }));
  expect(screen.getByText("Rutekart lastet")).toBeTruthy();
  expect(from).toHaveBeenCalledTimes(1);
  expect(from).toHaveBeenCalledWith("posts");
  expect(chain.select).toHaveBeenCalledWith("route,max_speed_kmh");
  await fireEvent.press(screen.getByRole("button", { name: "Skjul rutekart" }));
  expect(screen.queryByText("Rutekart lastet")).toBeNull();
  expect(chain.abortSignal.mock.calls[0][0].aborted).toBe(true);
});
test("a successful reaction updates the feed snapshot for recycled list rows, while failed writes do not", async () => {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  (client as jest.Mock).mockReturnValue({ from: () => ({ upsert }) });
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
test("football posts expose both maps and GPS speed only after opening the authorized post details", async () => {
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
  expect(from).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Vis rute og varmekart" }),
  );
  expect(screen.getByRole("tab", { name: "Varmekart" })).toBeTruthy();
  expect(screen.getByText(/Maksfart · GPS/)).toBeTruthy();
  expect(screen.getByText(/21.6 km\/t|21,6 km\/t/)).toBeTruthy();
});
