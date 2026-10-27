import { act, render, screen } from "@testing-library/react-native";
import type {
  MapViewProps,
  MapPolylineProps,
  MapMarkerProps,
  Camera,
} from "react-native-maps";
import AppleMap from "../src/components/LiveMap.ios";
import {
  appleInitialRegion,
  appleMapGeometry,
} from "../src/features/maps/appleGeometry";

let mockProps: MapViewProps;
const mockAnimate = jest.fn();
const mockSet = jest.fn();
const mockCamera = jest.fn();
const mockFit = jest.fn();
const mockMount = jest.fn();
let mockNativeModeChange: (() => void) | undefined;
jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    PROVIDER_DEFAULT: undefined,
    default: React.forwardRef((props: MapViewProps, ref: unknown) => {
      mockProps = props;
      React.useLayoutEffect(() => {
        mockNativeModeChange?.();
      }, [props.mapType, props.pitchEnabled]);
      React.useImperativeHandle(ref, () => ({
        animateCamera: mockAnimate,
        setCamera: mockSet,
        getCamera: mockCamera,
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
beforeEach(() => {
  jest.clearAllMocks();
  mockNativeModeChange = undefined;
  mockSet.mockReset();
  mockCamera
    .mockReset()
    .mockResolvedValue({ center: a, pitch: 0, heading: 25, altitude: 1234 });
});

afterEach(() => jest.useRealTimers());

test.each([
  ["standard", true],
  ["standard", false],
  ["satellite", true],
  ["satellite", false],
  ["hybrid", true],
  ["hybrid", false],
] as const)(
  "%s reaches %s 3D after a delayed native reset without the fit-route button",
  async (mapKind, threeD) => {
    jest.useFakeTimers();
    let native = {
      center: c,
      altitude: 432,
      heading: 68,
      pitch: threeD ? 0 : 55,
    };
    mockCamera.mockImplementation(async () => native);
    mockSet.mockImplementation((camera) => {
      native = { ...native, ...camera };
    });
    await render(
      <AppleMap mapKind={mapKind} threeD={!threeD} route={[[a, b]]} />,
    );
    await act(async () => mockProps.onMapReady?.());
    native = { ...native, heading: 68 };
    mockFit.mockClear();
    await screen.rerender(
      <AppleMap mapKind={mapKind} threeD={threeD} route={[[a, b]]} />,
    );
    // Model MapKit completing a style/pitchEnabled update AFTER React's layout
    // effect/setCamera. Previous tests only reset it synchronously during render.
    native = { center: d, altitude: 8000, heading: 0, pitch: threeD ? 0 : 55 };
    await act(async () => mockProps.onRegionChangeComplete?.({} as never, {}));
    expect(native).toEqual({
      center: c,
      altitude: 432,
      heading: 68,
      pitch: threeD ? 55 : 0,
    });
    // Some native mode resets do not emit region callbacks. It still converges.
    native = { ...native, altitude: 8000, pitch: threeD ? 0 : 55 };
    await act(async () => {
      await jest.advanceTimersByTimeAsync(180);
    });
    expect(native).toEqual({
      center: c,
      altitude: 432,
      heading: 68,
      pitch: threeD ? 55 : 0,
    });
    expect(mockFit).not.toHaveBeenCalled();
    expect(mockMount).toHaveBeenCalledTimes(1);
    await screen.unmount();
    const reads = mockCamera.mock.calls.length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000);
    });
    expect(mockCamera).toHaveBeenCalledTimes(reads);
  },
);

test("camera reconciliation stops for a new selection, pinch/touch, unmount and after its time limit", async () => {
  jest.useFakeTimers();
  let native = { center: c, altitude: 432, heading: 68, pitch: 0 };
  mockCamera.mockImplementation(async () => native);
  mockSet.mockImplementation((camera) => {
    native = { ...native, ...camera };
  });
  await render(<AppleMap mapKind="hybrid" />);
  await act(async () => mockProps.onMapReady?.());
  await screen.rerender(<AppleMap mapKind="hybrid" threeD />);
  await screen.rerender(<AppleMap mapKind="hybrid" />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(180);
  });
  expect(native.pitch).toBe(0);
  await screen.rerender(<AppleMap mapKind="hybrid" threeD />);
  await act(async () => mockProps.onTouchStart?.({} as never));
  mockSet.mockClear();
  native = { ...native, altitude: 2000, heading: 140, pitch: 30 };
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  expect(mockSet).not.toHaveBeenCalled();
  await screen.rerender(<AppleMap mapKind="hybrid" />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  mockSet.mockClear();
  native = { ...native, altitude: 4000 };
  await act(async () => mockProps.onRegionChangeComplete?.({} as never, {}));
  expect(mockSet).not.toHaveBeenCalled();
  await screen.rerender(<AppleMap mapKind="hybrid" threeD />);
  await screen.unmount();
  mockSet.mockClear();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  expect(mockSet).not.toHaveBeenCalled();
});

test("the iOS entry uses Apple with distinct modes and no automatic GPS collection or remount", async () => {
  await render(<AppleMap mapKind="standard" position={a} />);
  expect(mockProps.provider).toBeUndefined();
  expect(mockProps.mapType).toBe("standard");
  expect(mockProps.showsUserLocation).toBe(false);
  expect(mockProps.showsMyLocationButton).toBe(false);
  await act(async () => mockProps.onMapReady?.());
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
  expect(mockSet).toHaveBeenCalledWith({
    center: a,
    altitude: 700,
    pitch: 0,
    heading: 0,
  });
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
  expect(mockAnimate).toHaveBeenCalledWith(
    expect.objectContaining({ center: b, altitude: 700 }),
  );
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
  expect(mockSet).toHaveBeenCalledWith({
    center: c,
    altitude: 5000,
    pitch: 55,
    heading: 0,
  });
  expect(mockProps.showsBuildings).toBe(true);
});

test("first render frames the actual route rather than loading Oslo before jumping", () => {
  const region = appleInitialRegion([c, d], null);
  expect(region.latitude).toBeCloseTo(60.005);
  expect(region.longitude).toBeCloseTo(11.005);
  expect(region.latitudeDelta).toBeGreaterThan(0);
  expect(appleInitialRegion([a], null).latitudeDelta).toBeGreaterThan(0);
});

test.each(["standard", "satellite", "hybrid"] as const)(
  "%s switches between 2D and 3D without fitting again or changing altitude/center/heading",
  async (mapKind) => {
    const padding = { top: 170, right: 68, bottom: 350, left: 35 };
    const renderMap = (threeD: boolean) => (
      <AppleMap
        mapKind={mapKind}
        threeD={threeD}
        route={[[{ ...a }, { ...b }]]}
        padding={{ ...padding }}
      />
    );
    await render(renderMap(false));
    await act(async () => mockProps.onMapReady?.());
    mockFit.mockClear();
    mockSet.mockClear();
    mockAnimate.mockClear();
    const camera = { center: c, altitude: 678, heading: 83, pitch: 0 };
    mockCamera.mockResolvedValue(camera);
    await screen.rerender(renderMap(true));
    expect(mockProps.mapType).toBe(
      mapKind === "standard" ? "standard" : `${mapKind}Flyover`,
    );
    expect(mockProps.pitchEnabled).toBe(true);
    expect(mockSet).toHaveBeenLastCalledWith({ ...camera, pitch: 55 });
    mockCamera.mockResolvedValue({ ...camera, pitch: 55 });
    await screen.rerender(renderMap(false));
    expect(mockProps.mapType).toBe(mapKind);
    expect(mockProps.pitchEnabled).toBe(false);
    expect(mockSet).toHaveBeenLastCalledWith(camera);
    expect(mockFit).not.toHaveBeenCalled();
    expect(mockAnimate).not.toHaveBeenCalled();
    expect(mockMount).toHaveBeenCalledTimes(1);
  },
);

test("a delayed 3D camera read cannot override a newer 2D selection, pan or unmount", async () => {
  await render(<AppleMap />);
  await act(async () => mockProps.onMapReady?.());
  let finish!: (value: unknown) => void;
  mockCamera.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await screen.rerender(<AppleMap threeD />);
  await screen.rerender(<AppleMap />);
  mockSet.mockClear();
  await act(async () =>
    finish({ center: a, altitude: 1234, pitch: 55, heading: 25 }),
  );
  expect(mockSet).not.toHaveBeenCalled();
  mockCamera.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await screen.rerender(<AppleMap threeD />);
  await act(async () => mockProps.onPanDrag?.({} as never));
  await act(async () =>
    finish({ center: a, altitude: 1234, pitch: 0, heading: 25 }),
  );
  expect(mockSet).not.toHaveBeenCalled();
  mockCamera.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await screen.rerender(<AppleMap />);
  await screen.unmount();
  await act(async () =>
    finish({ center: a, altitude: 1234, pitch: 55, heading: 25 }),
  );
  expect(mockSet).not.toHaveBeenCalled();
});

test.each(["standard", "satellite", "hybrid"] as const)(
  "%s captures the camera before native mode changes can reset zoom",
  async (mapKind) => {
    let camera = { center: c, altitude: 432, heading: 68, pitch: 0 };
    mockCamera.mockImplementation(async () => ({ ...camera }));
    mockSet.mockImplementation((next: Partial<Camera>) => {
      camera = { ...camera, ...next };
    });
    await render(<AppleMap mapKind={mapKind} />);
    await act(async () => mockProps.onMapReady?.());
    // Simulate the user choosing their own zoom and heading after loading.
    camera = { center: c, altitude: 432, heading: 68, pitch: 0 };
    mockNativeModeChange = () => {
      camera = { ...camera, altitude: camera.altitude * 3, pitch: 0 };
    };
    for (let i = 0; i < 3; i++) {
      await screen.rerender(<AppleMap mapKind={mapKind} threeD />);
      expect(camera).toEqual({
        center: c,
        altitude: 432,
        heading: 68,
        pitch: 55,
      });
      await screen.rerender(<AppleMap mapKind={mapKind} />);
      expect(camera).toEqual({
        center: c,
        altitude: 432,
        heading: 68,
        pitch: 0,
      });
    }
    expect(mockFit).not.toHaveBeenCalled();
    expect(mockMount).toHaveBeenCalledTimes(1);
  },
);

test("the native mode stays unchanged while its camera snapshot is pending", async () => {
  await render(<AppleMap mapKind="satellite" threeD />);
  await act(async () => mockProps.onMapReady?.());
  let finish!: (value: unknown) => void;
  mockCamera.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await screen.rerender(<AppleMap mapKind="satellite" />);
  expect(mockProps.mapType).toBe("satelliteFlyover");
  expect(mockProps.pitchEnabled).toBe(true);
  await act(async () =>
    finish({ center: c, altitude: 380, heading: 42, pitch: 55 }),
  );
  expect(mockProps.mapType).toBe("satellite");
  expect(mockProps.pitchEnabled).toBe(false);
  expect(mockSet).toHaveBeenLastCalledWith({
    center: c,
    altitude: 380,
    heading: 42,
    pitch: 0,
  });
});

test("following a GPS fix and fitting an expanded panel retain the selected 3D pitch", async () => {
  await render(<AppleMap threeD follow position={a} />);
  await act(async () => mockProps.onMapReady?.());
  expect(mockSet).toHaveBeenLastCalledWith(
    expect.objectContaining({ center: a, pitch: 55 }),
  );
  await screen.rerender(<AppleMap threeD follow position={b} />);
  expect(mockAnimate).toHaveBeenLastCalledWith(
    expect.objectContaining({ center: b, pitch: 55 }),
  );
  await screen.rerender(<AppleMap threeD route={[[a, b]]} />);
  await screen.rerender(
    <AppleMap
      threeD
      route={[[a, b]]}
      padding={{ top: 170, left: 30, right: 60, bottom: 360 }}
    />,
  );
  expect(mockFit).toHaveBeenLastCalledWith(
    [a, b],
    expect.objectContaining({
      edgePadding: { top: 170, left: 30, right: 60, bottom: 360 },
    }),
  );
  expect(mockSet).toHaveBeenLastCalledWith(
    expect.objectContaining({ pitch: 55 }),
  );
});

test("the first GPS fix zooms in and an embedded workout map keeps following after a drag", async () => {
  await render(<AppleMap follow />);
  await act(async () => mockProps.onMapReady?.());
  mockAnimate.mockClear();
  await screen.rerender(<AppleMap follow position={a} />);
  expect(mockAnimate).toHaveBeenCalledWith(
    expect.objectContaining({ center: a, altitude: 700 }),
  );
  await act(async () => mockProps.onPanDrag?.({} as never));
  mockAnimate.mockClear();
  await screen.rerender(<AppleMap follow position={b} />);
  expect(mockAnimate).toHaveBeenCalledWith(
    expect.objectContaining({ center: b, altitude: 1234 }),
  );
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
  expect(mockAnimate).toHaveBeenCalledWith(
    expect.objectContaining({ center: a, altitude: 5000 }),
  );
});
