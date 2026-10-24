import { act, render, screen } from "@testing-library/react-native";
import type {
  MapViewProps,
  MapPolylineProps,
  MapMarkerProps,
} from "react-native-maps";
import AppleMap from "../src/components/LiveMap.ios";
import {
  appleInitialRegion,
  appleMapGeometry,
} from "../src/features/maps/appleGeometry";

let mockProps: MapViewProps;
const mockAnimate = jest.fn();
const mockFit = jest.fn();
const mockMount = jest.fn();
jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    PROVIDER_DEFAULT: undefined,
    default: React.forwardRef((props: MapViewProps, ref: unknown) => {
      mockProps = props;
      React.useImperativeHandle(ref, () => ({
        animateCamera: mockAnimate,
        fitToCoordinates: mockFit,
      }));
      React.useEffect(() => {
        mockMount();
      }, []);
      return <View>{props.children}</View>;
    }),
    Polyline: (props: MapPolylineProps) => (
      <View testID="route-line" {...props} />
    ),
    Marker: (props: MapMarkerProps) => <View testID="map-marker" {...props} />,
  };
});
const a = { latitude: 59.9, longitude: 10.7 };
const b = { latitude: 59.91, longitude: 10.71 };
const c = { latitude: 60, longitude: 11 };
const d = { latitude: 60.01, longitude: 11.01 };
beforeEach(() => jest.clearAllMocks());

test("the iOS entry uses Apple with distinct modes and no automatic GPS collection or remount", async () => {
  await render(<AppleMap mapKind="standard" position={a} />);
  expect(mockProps.provider).toBeUndefined();
  expect(mockProps.mapType).toBe("standard");
  expect(mockProps.showsUserLocation).toBe(false);
  expect(mockProps.showsMyLocationButton).toBe(false);
  await screen.rerender(<AppleMap mapKind="satellite" position={a} />);
  expect(mockProps.mapType).toBe("satellite");
  expect(mockProps.showsPointsOfInterests).toBe(false);
  await screen.rerender(<AppleMap mapKind="hybrid" position={a} />);
  expect(mockProps.mapType).toBe("hybrid");
  expect(mockProps.showsPointsOfInterests).toBe(true);
  expect(mockMount).toHaveBeenCalledTimes(1);
});

test("workouts and turf overlays preserve pauses as separate colored polylines", async () => {
  const route = [
    [a, b],
    [c, d],
  ];
  const overlays = [
    {
      id: "turf",
      name: "Rute",
      owner: "",
      color: "#ABCDEF",
      points: [a, b, { ...c, breakBefore: true }, d],
    },
  ];
  const shape = appleMapGeometry(route, overlays);
  expect(shape.lines.map((line) => line.coordinates)).toEqual([
    [a, b],
    [c, d],
    [a, b],
    [c, d],
  ]);
  expect(shape.markers).toHaveLength(2);
  await render(<AppleMap route={route} overlays={overlays} />);
  expect(screen.getAllByTestId("route-line")).toHaveLength(8); // outlines + colored paths
  expect(
    screen
      .getAllByTestId("route-line")
      .filter((line) => line.props.strokeColor === "#ABCDEF"),
  ).toHaveLength(2);
});

test("panning stops camera follow until the user recenters, without snapping to the route", async () => {
  const onPan = jest.fn();
  const route = [[a, b]];
  await render(<AppleMap follow position={a} route={route} onPan={onPan} />);
  expect(mockProps.initialRegion?.latitude).toBe(a.latitude);
  await act(async () => mockProps.onMapReady?.());
  expect(mockAnimate).toHaveBeenCalledWith({ center: a, altitude: 700 });
  await act(async () => mockProps.onPanDrag?.({} as never));
  expect(onPan).toHaveBeenCalledTimes(1);
  mockAnimate.mockClear();
  mockFit.mockClear();
  await screen.rerender(
    <AppleMap follow position={b} route={route} onPan={onPan} />,
  );
  await screen.rerender(
    <AppleMap follow={false} position={b} route={[[a, b, c]]} onPan={onPan} />,
  );
  expect(mockAnimate).not.toHaveBeenCalled();
  expect(mockFit).not.toHaveBeenCalled();
  await screen.rerender(
    <AppleMap follow position={b} recenter={1} route={route} />,
  );
  expect(mockAnimate).toHaveBeenCalledWith({ center: b, altitude: 700 });
});

test("route fitting respects panel insets, while search, north and 3D controls move the camera", async () => {
  const padding = { top: 180, right: 60, bottom: 300, left: 30 };
  await render(
    <AppleMap route={[[a, b]]} padding={padding} attributionBottom={260} />,
  );
  await act(async () => mockProps.onMapReady?.());
  expect(mockFit).toHaveBeenCalledWith([a, b], {
    edgePadding: padding,
    animated: false,
  });
  expect(mockProps.legalLabelInsets?.bottom).toBe(268);
  expect(mockProps.appleLogoInsets?.bottom).toBe(268);
  await screen.rerender(<AppleMap target={c} threeD north={1} />);
  expect(mockAnimate).toHaveBeenCalledWith({ center: c, altitude: 5000 });
  expect(mockAnimate).toHaveBeenCalledWith({ pitch: 55 });
  expect(mockAnimate).toHaveBeenCalledWith({ heading: 0 });
  expect(mockProps.showsBuildings).toBe(true);
});

test("first render frames the actual route rather than loading Oslo before jumping", () => {
  const region = appleInitialRegion([c, d], null);
  expect(region.latitude).toBeCloseTo(60.005);
  expect(region.longitude).toBeCloseTo(11.005);
  expect(region.latitudeDelta).toBeGreaterThan(0);
  expect(appleInitialRegion([a], null).latitudeDelta).toBeGreaterThan(0);
});

test("the first GPS fix zooms in and an embedded workout map keeps following after a drag", async () => {
  await render(<AppleMap follow />);
  await act(async () => mockProps.onMapReady?.());
  mockAnimate.mockClear();
  await screen.rerender(<AppleMap follow position={a} />);
  expect(mockAnimate).toHaveBeenCalledWith({ center: a, altitude: 700 });
  await act(async () => mockProps.onPanDrag?.({} as never));
  mockAnimate.mockClear();
  await screen.rerender(<AppleMap follow position={b} />);
  expect(mockAnimate).toHaveBeenCalledWith({ center: b });
});

test("choosing another route or selecting the same search result again overrides a manual pan", async () => {
  const overlay = {
    id: "one",
    name: "Rute",
    owner: "",
    color: "#ABCDEF",
    points: [a, b],
  };
  await render(<AppleMap overlays={[overlay]} />);
  await act(async () => mockProps.onMapReady?.());
  await act(async () => mockProps.onPanDrag?.({} as never));
  mockFit.mockClear();
  await screen.rerender(
    <AppleMap overlays={[{ ...overlay, id: "two", points: [c, d] }]} />,
  );
  expect(mockFit).toHaveBeenCalledWith([c, d], expect.anything());
  await screen.rerender(<AppleMap target={a} />);
  await act(async () => mockProps.onPanDrag?.({} as never));
  mockAnimate.mockClear();
  await screen.rerender(<AppleMap target={{ ...a }} />);
  expect(mockAnimate).toHaveBeenCalledWith({ center: a, altitude: 5000 });
});
