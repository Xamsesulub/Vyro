import { render, screen, fireEvent } from "@testing-library/react-native";
import type { Session } from "@supabase/supabase-js";
import { ExportWorkout } from "../src/components/ExportWorkout";
import { shareFile } from "../src/lib/shareFile";
import { useAuthStore } from "../src/stores/useAuthStore";
import type { Workout } from "../src/features/activities/model";

jest.mock("../src/lib/shareFile", () => ({
  shareFile: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/lib/supabase", () => ({ supabase: null }));
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { View, Text, Pressable } = jest.requireActual("react-native");
  return {
    Card: View,
    Txt: Text,
    Button: ({
      title,
      onPress,
      disabled,
    }: {
      title: string;
      onPress: () => void;
      disabled: boolean;
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
const workout: Workout = {
  id: "gps-1",
  source: "gps",
  ownerId: "a",
  title: "Tur",
  sport: "Gange",
  seconds: 60,
  distance: 0.1,
  date: "2026-10-22",
  notes: "private",
  visibility: "private",
  route: [
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.901, longitude: 10.7 },
  ],
};
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ session: { user: { id: "a" } } as Session });
});
test("requires an explicit privacy confirmation before exporting the original route", async () => {
  await render(<ExportWorkout workout={workout} />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Eksporter rute (GPX)" }),
  );
  expect(shareFile).not.toHaveBeenCalled();
  expect(screen.getByText(/hele GPS-ruten/)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Lagre eller del GPX" }),
  );
  expect(shareFile).toHaveBeenCalledTimes(1);
  expect(jest.mocked(shareFile).mock.calls[0][0].contents).toContain(
    'lat="59.9"',
  );
  expect(jest.mocked(shareFile).mock.calls[0][0].contents).not.toContain(
    "private",
  );
});
test("does not offer exports for other owners or simulated workouts", async () => {
  const result = await render(
    <ExportWorkout workout={{ ...workout, ownerId: "b" }} />,
  );
  expect(screen.queryByRole("button")).toBeNull();
  await result.rerender(
    <ExportWorkout workout={{ ...workout, source: "simulation" }} />,
  );
  expect(screen.queryByRole("button")).toBeNull();
});
