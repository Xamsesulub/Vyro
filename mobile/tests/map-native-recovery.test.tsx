import type { ComponentProps } from "react";
import Mapbox from "@rnmapbox/maps";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import MapboxNative from "../src/components/MapboxNative";

let mockMapProps: ComponentProps<typeof Mapbox.MapView>;
let mockCameraProps: ComponentProps<typeof Mapbox.Camera>;
const mockMount = jest.fn();
const mockFitBounds = jest.fn();
const mockSetCamera = jest.fn();
jest.mock("../src/components/ui", () => ({
  Txt: require("react-native").Text,
}));
jest.mock("@rnmapbox/maps", () => {
  const React = require("react");
  const View = require("react-native").View;
  return {
    __esModule: true,
    default: {
      setAccessToken: jest.fn(),
      MapView: (props: ComponentProps<typeof Mapbox.MapView>) => {
        mockMapProps = props;
        React.useEffect(() => {
          mockMount();
        }, []);
        return <View>{props.children}</View>;
      },
      Camera: React.forwardRef(
        (props: ComponentProps<typeof Mapbox.Camera>, ref: unknown) => {
          mockCameraProps = props;
          React.useImperativeHandle(ref, () => ({
            setCamera: mockSetCamera,
            fitBounds: mockFitBounds,
          }));
          return null;
        },
      ),
      StyleImport: () => null,
      ShapeSource: View,
      LineLayer: () => null,
      CircleLayer: () => null,
      SymbolLayer: () => null,
    },
  };
});

test("native rate-limit failures allow one manual reload after the cooldown and preserve the camera", async () => {
  jest.useFakeTimers();
  try {
    await render(
      <MapboxNative
        mapKind="satellite"
        route={[
          [
            { latitude: 59.9, longitude: 10.7 },
            { latitude: 59.91, longitude: 10.71 },
          ],
        ]}
      />,
    );
    await act(async () => mockMapProps.onDidFinishLoadingStyle!());
    await act(async () =>
      mockMapProps.onCameraChanged!({
        properties: {
          center: [10.8, 59.95],
          zoom: 14,
          pitch: 0,
          heading: 35,
          bounds: { ne: [11, 60], sw: [10, 59] },
        },
        gestures: { isGestureActive: true },
      }),
    );
    await act(async () =>
      mockMapProps.onMapLoadingError!({
        error: "HTTP status code 429",
        type: "tile",
      }),
    );
    expect(screen.getByText(/begrenser tilgangen/)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Prøv kartet på nytt" }),
    );
    expect(mockMount).toHaveBeenCalledTimes(1);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_001);
    });
    expect(mockMount).toHaveBeenCalledTimes(1);
    await fireEvent.press(
      screen.getByRole("button", { name: "Prøv kartet på nytt" }),
    );
    expect(mockMount).toHaveBeenCalledTimes(2);
    expect(mockCameraProps.defaultSettings).toEqual({
      centerCoordinate: [10.8, 59.95],
      zoomLevel: 14,
      pitch: 0,
      heading: 35,
    });
    mockFitBounds.mockClear();
    await act(async () => mockMapProps.onDidFinishLoadingStyle!());
    expect(mockFitBounds).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () =>
      mockMapProps.onMapLoadingError!({
        error: "HTTP status code 429",
        type: "tile",
      }),
    );
    expect(screen.getByRole("alert")).toBeTruthy();
  } finally {
    await screen.unmount();
    jest.useRealTimers();
  }
});
