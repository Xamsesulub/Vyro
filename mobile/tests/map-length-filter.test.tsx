import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { MapLengthFilter } from "../src/components/MapLengthFilter";

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) =>
    require("react").useEffect(effect, [effect]),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("../src/components/ui", () => ({ Icon: () => null }));

const changed = jest.fn();
function Filter() {
  const [value, setValue] = useState(0);
  return (
    <MapLengthFilter
      value={value}
      onChange={(v) => {
        setValue(v);
        changed(v);
      }}
    />
  );
}
const tap = (name: string) => fireEvent.press(screen.getByLabelText(name));

async function mount() {
  changed.mockClear();
  jest
    .requireActual("@react-native/jest-preset/jest/MockNativeMethods")
    .default.measureInWindow.mockImplementation(
      (callback: (x: number, y: number, w: number, h: number) => void) =>
        callback(225, 120, 95, 48),
    );
  await render(<Filter />);
}

test("opening the menu does not change length; selection persists and All clears it", async () => {
  await mount();
  await tap("Filtrer på lengde");
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getAllByRole("menuitem")).toHaveLength(4);
  expect(screen.getByRole("menuitem", { name: "Alle lengder" })).toBeSelected();
  await fireEvent.press(screen.getByRole("menuitem", { name: "3–10 km" }));
  expect(changed).toHaveBeenLastCalledWith(2);
  expect(screen.queryByRole("menu")).toBeNull();
  expect(screen.getByLabelText("Filtrer på lengde")).toHaveAccessibilityValue({
    text: "3–10 km",
  });
  await tap("Filtrer på lengde");
  expect(screen.getByRole("menuitem", { name: "3–10 km" })).toBeSelected();
  await fireEvent.press(screen.getByRole("menuitem", { name: "Alle lengder" }));
  expect(changed).toHaveBeenLastCalledWith(0);
  expect(screen.getByText("Lengde")).toBeTruthy();
});

test("tapping outside closes without selecting the next length", async () => {
  await mount();
  await tap("Filtrer på lengde");
  await tap("Lukk lengdevalg");
  expect(screen.queryByRole("menu")).toBeNull();
  expect(changed).not.toHaveBeenCalled();
});
