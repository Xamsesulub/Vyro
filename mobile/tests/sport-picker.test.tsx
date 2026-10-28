import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import SportPicker from "../src/components/SportPicker";
import RecordingMap from "../src/components/RecordingMap";
import { initialRecording } from "../src/features/tracking/simulator";
import { useTrackingStatus } from "../src/stores/useTrackingStatus";
jest.mock("../src/components/ui", () => {
  const React = jest.requireActual("react");
  const { Text, Pressable } = jest.requireActual("react-native");
  return {
    Txt: Text,
    Icon: () => null,
    useTheme: () => ({
      text: "black",
      surface: "white",
      muted: "gray",
      raised: "#eee",
      accent: "green",
    }),
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: "button", accessibilityLabel: title },
        React.createElement(Text, null, title),
      ),
  };
});
jest.mock("../src/components/LiveMap", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));

test("search selects an indoor sport and closes the picker", async () => {
  const select = jest.fn(),
    close = jest.fn();
  await render(
    <SportPicker selected={["Løping"]} onSelect={select} onClose={close} />,
  );
  await fireEvent.changeText(screen.getByLabelText("Søk etter idrett"), "yoga");
  await fireEvent.press(screen.getByRole("radio", { name: "Yoga" }));
  expect(select).toHaveBeenCalledWith("Yoga");
  expect(close).toHaveBeenCalledTimes(1);
});

test("multiple sport selections keep the picker open", async () => {
  const select = jest.fn(),
    close = jest.fn();
  await render(
    <SportPicker
      selected={["Løping"]}
      multiple
      onSelect={select}
      onClose={close}
    />,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Søk etter idrett"),
    "fotball",
  );
  await fireEvent.press(screen.getByRole("checkbox", { name: "Fotball" }));
  expect(select).toHaveBeenCalledWith("Fotball");
  expect(close).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Ferdig med idrettsvalg" }),
  );
  expect(close).toHaveBeenCalledTimes(1);
});

test("map start screen has working sport/start/settings controls and no switches", async () => {
  useTrackingStatus.setState({ starting: false, error: null });
  const start = jest.fn(),
    sport = jest.fn();
  await render(
    <RecordingMap
      recording={initialRecording}
      position={null}
      error={null}
      start={start}
      chooseSport={sport}
      pause={() => {}}
      resume={() => {}}
      finish={() => {}}
    />,
  );
  expect(screen.queryAllByRole("switch")).toHaveLength(0);
  await fireEvent.press(screen.getByRole("button", { name: "Start" }));
  expect(start).toHaveBeenCalledTimes(1);
  await fireEvent.press(
    screen.getByRole("button", { name: "Velg idrett, Løping" }),
  );
  expect(sport).toHaveBeenCalledTimes(1);
  await fireEvent.press(
    screen.getByRole("button", { name: "Treningsinnstillinger" }),
  );
  expect(router.push).toHaveBeenCalledWith("/training-settings");
});
