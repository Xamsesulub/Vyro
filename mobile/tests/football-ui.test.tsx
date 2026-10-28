import { fireEvent, render, screen } from "@testing-library/react-native";
import type { Session } from "@supabase/supabase-js";
import FootballMap from "../src/components/FootballMap";
import ShareWorkout from "../src/app/share-workout";
import { useAppStore, appPersistence } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import { publish } from "../src/features/social/api";
import type { LiveMapProps } from "../src/features/maps/geometry";
import type { Workout } from "../src/features/activities/model";
let mockMap: LiveMapProps;
jest.mock("../src/components/AccountGate", () => ({
  AccountGate: ({ children }: { children: import("react").ReactNode }) =>
    children,
}));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { View, Text, Pressable } = jest.requireActual("react-native");
  return {
    Screen: View,
    Txt: Text,
    useTheme: () => ({ bg: "white", raised: "#eee" }),
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
          disabled,
          accessibilityRole: "button",
          accessibilityLabel: title,
        },
        React.createElement(Text, null, title),
      ),
  };
});
jest.mock("../src/components/LiveMap", () => ({
  __esModule: true,
  default: (props: LiveMapProps) => {
    mockMap = props;
    return null;
  },
}));
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn(), prefetch: jest.fn() },
}));
jest.mock("../src/features/social/api", () => ({
  publish: jest.fn(),
  socialError: () => "Kunne ikke publisere.",
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
}));
const points = [
  { latitude: 59.9, longitude: 10.7 },
  { latitude: 59.9006, longitude: 10.7 },
  { latitude: 59.9006, longitude: 10.7006 },
];
const workout: Workout = {
  id: "a",
  ownerId: "owner",
  title: "Kamp A",
  sport: "Fotball",
  route: points,
  source: "gps",
  visibility: "private",
  distance: 1,
  seconds: 600,
  date: "2026-10-27T10:00:00Z",
  notes: "",
};
beforeEach(() => {
  useAppStore.setState({
    workouts: [workout, { ...workout, id: "b", title: "Kamp B" }],
    theme: "light",
  });
  useAuthStore.setState({
    ready: true,
    session: { user: { id: "owner" } } as Session,
  });
  (publish as jest.Mock).mockReset().mockResolvedValue("post");
});
afterEach(async () => {
  await appPersistence.flush();
});
test("map switch changes only artwork, preserves route geometry, and explains movement density", async () => {
  await render(<FootballMap points={points} />);
  const route = mockMap.route;
  expect(mockMap.heatmap).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: "Varmekart" }));
  expect(mockMap.heatmap?.uri).toMatch(/^data:image\/png;base64,/);
  expect(mockMap.route).toBe(route);
  expect(screen.getByText(/ikke tiden du sto stille/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("tab", { name: "Rute" }));
  expect(mockMap.heatmap).toBeNull();
  expect(mockMap.route).toBe(route);
});
test("whole pitch sharing requires fresh consent after switching workouts", async () => {
  await render(<ShareWorkout />);
  await fireEvent.press(screen.getByRole("button", { name: "Kamp A" }));
  expect(
    screen.getByRole("button", { name: "Publiser økten med kart" }),
  ).toBeDisabled();
  await fireEvent(
    screen.getByLabelText("Del hele fotballruten"),
    "valueChange",
    true,
  );
  expect(
    screen.getByRole("button", { name: "Publiser økten med kart" }),
  ).toBeEnabled();
  expect(screen.getByText(/Start og slutt er synlige/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Kamp B" }));
  expect(screen.getByLabelText("Del hele fotballruten").props.value).toBe(
    false,
  );
  expect(
    screen.getByRole("button", { name: "Publiser økten med kart" }),
  ).toBeDisabled();
  await fireEvent(
    screen.getByLabelText("Del hele fotballruten"),
    "valueChange",
    true,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Publiser økten med kart" }),
  );
  expect(publish).toHaveBeenCalledWith(
    expect.objectContaining({ id: "b" }),
    "owner",
    "followers",
    true,
  );
});
jest.mock("../src/features/auth/useOwnProfile",()=>({useOwnProfile:()=>({profile:{id:"owner",is_private:false},failed:false})}));
