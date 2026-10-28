import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { NotificationCategories } from "../src/components/NotificationCategories";
import { defaultNotificationPreferences } from "../src/features/social/notificationPreferences";
const mockLoad = jest.fn();
const mockSave = jest.fn();
jest.mock("../src/features/social/notificationPreferences", () => ({
  ...jest.requireActual("../src/features/social/notificationPreferences"),
  loadNotificationPreferences: (...args: unknown[]) => mockLoad(...args),
  saveNotificationPreference: (...args: unknown[]) => mockSave(...args),
}));
jest.mock("../src/features/social/api", () => ({
  socialError: () => "Kunne ikke lagre valget.",
}));
jest.mock("../src/features/social/profiles", () => ({
  requireOwner: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) =>
    jest.requireActual("react").useEffect(effect, [effect]),
}));
jest.mock("../src/components/SettingsUi", () => {
  const React = jest.requireActual("react");
  const { View, Text } = jest.requireActual("react-native");
  return {
    PageNote: Text,
    SettingsGroup: View,
    SettingsRow: ({ title, end }: { title: string; end: unknown }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, title),
        end,
      ),
  };
});
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: Text,
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: "button", accessibilityLabel: title },
        React.createElement(Text, null, title),
      ),
  };
});
beforeEach(() => {
  mockLoad.mockReset().mockResolvedValue(defaultNotificationPreferences());
  mockSave.mockReset().mockResolvedValue(undefined);
});
test("eight independent channel choices save only the chosen category", async () => {
  await render(<NotificationCategories owner="alex" />);
  await screen.findByLabelText("Kommentarer: på telefonen");
  await fireEvent(
    screen.getByLabelText("Kommentarer: på telefonen"),
    "valueChange",
    false,
  );
  await waitFor(() =>
    expect(mockSave).toHaveBeenCalledWith("alex", "comments", {
      in_app: true,
      push: false,
    }),
  );
  expect(screen.getByLabelText("Kommentarer: på telefonen").props.value).toBe(
    false,
  );
  expect(screen.getByLabelText("Kommentarer: i appen").props.value).toBe(true);
  expect(screen.getByLabelText("Likerklikk: på telefonen").props.value).toBe(
    true,
  );
  expect(screen.getByLabelText("Nye innlegg: på telefonen").props.value).toBe(
    false,
  );
});
test("a failed save preserves the previous switch value and shows a retry", async () => {
  mockSave.mockRejectedValue(new Error("offline"));
  await render(<NotificationCategories owner="alex" />);
  await screen.findByLabelText("Likerklikk: i appen");
  await fireEvent(
    screen.getByLabelText("Likerklikk: i appen"),
    "valueChange",
    false,
  );
  await screen.findByText("Kunne ikke lagre valget.");
  expect(screen.getByLabelText("Likerklikk: i appen").props.value).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Hent varselvalg på nytt" }),
  );
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
});
test("failed loading never presents unsaved defaults as active settings", async () => {
  mockLoad.mockRejectedValue(new Error("offline"));
  await render(<NotificationCategories owner="alex" />);
  await screen.findByText("Kunne ikke lagre valget.");
  expect(screen.queryByLabelText("Nye innlegg: på telefonen")).toBeNull();
});
