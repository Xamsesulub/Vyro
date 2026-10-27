import { JSDOM } from "jsdom";
import { act, type ReactNode } from "react";
import LiveMap from "../src/components/LiveMap.web";
import { loadMapEngine } from "../src/features/maps/prewarm.web";

jest.mock("react-native", () => ({ View: "div" }));
jest.mock("../src/components/ui", () => ({ Txt: "span" }));
jest.mock("../src/components/MapLoadNotice", () => ({
  MapLoadNotice: ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry: () => void;
  }) => (
    <div role="alert">
      {message}
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));
jest.mock("mapbox-gl-v3/dist/mapbox-gl.css", () => ({}));
jest.mock("../src/features/maps/config", () => ({
  ...jest.requireActual("../src/features/maps/config"),
  hasMapbox: true,
  mapboxToken: "pk.test",
}));
jest.mock("../src/features/maps/prewarm.web", () => ({
  loadMapEngine: jest.fn(),
}));

type TestRoot = { render(node: ReactNode): void; unmount(): void };
const { createRoot } = require("react-dom/client") as {
  createRoot(container: HTMLElement): TestRoot;
};
let root: TestRoot;
let container: HTMLDivElement;
let dom: JSDOM;
beforeEach(() => {
  // Expo's native preset owns global.window; install a DOM after its setup.
  dom = new JSDOM("<!doctype html><html><body></body></html>");
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  dom.window.close();
});

function engine() {
  const callbacks: Record<string, (event?: unknown) => void> = {};
  const config = new Map<string, unknown>();
  const source = { setData: jest.fn() };
  const sources = new Map<string, unknown>();
  const layers = new Set<string>();
  const map = {
    on: jest.fn((event: string, callback: (event?: unknown) => void) => {
      callbacks[event] = callback;
    }),
    addControl: jest.fn(),
    addSource: jest.fn((id: string, data: unknown) => sources.set(id, data)),
    addLayer: jest.fn((layer: { id: string }) => layers.add(layer.id)),
    getSource: jest.fn((name: string) =>
      name === "workout" ? source : sources.get(name),
    ),
    getLayer: jest.fn((id: string) => layers.has(id)),
    removeLayer: jest.fn((id: string) => layers.delete(id)),
    removeSource: jest.fn((id: string) => sources.delete(id)),
    setLayoutProperty: jest.fn(),
    getTerrain: () => null,
    setTerrain: jest.fn(),
    getConfigProperty: (_: string, key: string) => config.get(key),
    setConfigProperty: jest.fn((_: string, key: string, value: unknown) => {
      config.set(key, value);
    }),
    isStyleLoaded: () => false, // Style imports exist, but remote tiles are pending.
    setStyle: jest.fn(),
    easeTo: jest.fn(),
    fitBounds: jest.fn(),
    resize: jest.fn(),
    remove: jest.fn(),
    getCenter: () => ({ lng: 10.8, lat: 59.95 }),
    getZoom: () => 14,
    getPitch: () => 0,
    getBearing: () => 35,
  };
  const constructor = jest.fn((_options: unknown) => map);
  jest.mocked(loadMapEngine).mockResolvedValue({
    default: { Map: constructor, NavigationControl: jest.fn() },
  } as unknown as Awaited<ReturnType<typeof loadMapEngine>>);
  return { callbacks, map, config, source, constructor };
}

test("a known live position is the first camera, avoiding an initial download of the default Oslo view", async () => {
  const { constructor } = engine();
  await act(async () =>
    root.render(
      <LiveMap follow position={{ latitude: 60.39, longitude: 5.32 }} />,
    ),
  );
  expect(constructor.mock.calls[0][0]).toMatchObject({
    center: [5.32, 60.39],
    zoom: 16,
  });
  expect(constructor.mock.calls[0][0]).not.toHaveProperty("bounds");
});

test("a permission/position update preserves the existing map and tiles", async () => {
  const { constructor, callbacks, map } = engine();
  await act(async () => root.render(<LiveMap follow />));
  await act(async () => callbacks["style.load"]());
  await act(async () =>
    root.render(
      <LiveMap follow position={{ latitude: 59.9, longitude: 10.7 }} />,
    ),
  );
  expect(constructor).toHaveBeenCalledTimes(1);
  expect(map.remove).not.toHaveBeenCalled();
  expect(map.setStyle).not.toHaveBeenCalled();
  expect(map.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({ center: [10.7, 59.9] }),
  );
});
test("football heatmap is geographically aligned and toggles without rebuilding the map or changing zoom", async () => {
  const { constructor, callbacks, map } = engine();
  const route = [
    [
      { latitude: 59.9, longitude: 10.7 },
      { latitude: 59.9005, longitude: 10.7005 },
    ],
  ];
  const heatmap = {
    uri: "data:image/png;base64,test",
    bounds: [
      [60, 11],
      [59, 10],
    ] as [[number, number], [number, number]],
  };
  await act(async () =>
    root.render(<LiveMap route={route} mapKind="satellite" />),
  );
  await act(async () => callbacks["style.load"]());
  map.fitBounds.mockClear();
  map.easeTo.mockClear();
  await act(async () =>
    root.render(
      <LiveMap route={route} mapKind="satellite" heatmap={heatmap} />,
    ),
  );
  expect(map.addSource).toHaveBeenCalledWith("football-heatmap", {
    type: "image",
    url: heatmap.uri,
    coordinates: [
      [10, 60],
      [11, 60],
      [11, 59],
      [10, 59],
    ],
  });
  expect(map.setLayoutProperty).toHaveBeenCalledWith(
    "route",
    "visibility",
    "none",
  );
  await act(async () =>
    root.render(<LiveMap route={route} mapKind="satellite" />),
  );
  expect(map.removeLayer).toHaveBeenCalledWith("football-heatmap");
  expect(map.removeSource).toHaveBeenCalledWith("football-heatmap");
  expect(map.setLayoutProperty).toHaveBeenCalledWith(
    "route",
    "visibility",
    "visible",
  );
  expect(map.fitBounds).not.toHaveBeenCalled();
  expect(map.easeTo).not.toHaveBeenCalled();
  expect(constructor).toHaveBeenCalledTimes(1);
});

test("Hybrid toggles labels while tiles are pending, without resetting the style or workout source", async () => {
  const { callbacks, map, config, source } = engine();
  await act(async () =>
    root.render(
      <LiveMap
        mapKind="satellite"
        position={{ latitude: 59.9, longitude: 10.7 }}
      />,
    ),
  );
  await act(async () => callbacks["style.load"]());
  expect(source.setData).toHaveBeenCalled();
  await act(async () =>
    root.render(
      <LiveMap
        mapKind="hybrid"
        poi
        position={{ latitude: 59.9, longitude: 10.7 }}
      />,
    ),
  );
  expect(config.get("showRoadsAndTransit")).toBe(true);
  expect(config.get("showPointOfInterestLabels")).toBe(true);
  expect(map.setStyle).not.toHaveBeenCalled();
  expect(map.addSource).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<LiveMap mapKind="satellite" poi />));
  expect(config.get("showRoadsAndTransit")).toBe(false);
  expect(config.get("showPointOfInterestLabels")).toBe(false);
});

test("429 retries are bounded, recreate the engine, preserve the camera and restore the route", async () => {
  const { callbacks, map, source, constructor } = engine();
  let now = 100_000;
  const clock = jest.spyOn(Date, "now").mockImplementation(() => now);
  try {
    const route = [
      [
        { latitude: 59.9, longitude: 10.7 },
        { latitude: 59.91, longitude: 10.71 },
      ],
    ];
    await act(async () =>
      root.render(<LiveMap mapKind="satellite" route={route} />),
    );
    await act(async () => callbacks["style.load"]());
    const staleError = callbacks.error;
    await act(async () => callbacks.error({ error: { status: 429 } }));
    await act(async () => container.querySelector("button")!.click());
    expect(constructor).toHaveBeenCalledTimes(1);
    // Many failed tiles do not keep extending the first failure's cooldown.
    now += 29_000;
    await act(async () => callbacks.error({ error: { status: 429 } }));
    now += 1_001;
    expect(constructor).toHaveBeenCalledTimes(1); // No automatic requests.
    await act(async () => container.querySelector("button")!.click());
    expect(map.remove).toHaveBeenCalledTimes(1);
    expect(constructor).toHaveBeenCalledTimes(2);
    expect(constructor.mock.calls[1][0]).toMatchObject({
      center: [10.8, 59.95],
      zoom: 14,
      pitch: 0,
      bearing: 35,
    });
    expect(constructor.mock.calls[1][0]).not.toHaveProperty("bounds");
    map.fitBounds.mockClear();
    source.setData.mockClear();
    await act(async () => callbacks["style.load"]());
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(
      source.setData.mock.calls[0][0].features[0].geometry.coordinates,
    ).toEqual([
      [10.7, 59.9],
      [10.71, 59.91],
    ]);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => staleError({ error: { status: 429 } }));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => callbacks.error({ error: { status: 429 } }));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  } finally {
    clock.mockRestore();
  }
});

test("a failed lazy engine import can be retried without navigating away", async () => {
  const { constructor } = engine();
  jest.mocked(loadMapEngine).mockRejectedValueOnce(new Error("offline"));
  const clock = jest.spyOn(Date, "now").mockReturnValue(1_000);
  try {
    await act(async () => root.render(<LiveMap mapKind="satellite" />));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    clock.mockReturnValue(2_001);
    await act(async () => container.querySelector("button")!.click());
    expect(constructor).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  } finally {
    clock.mockRestore();
  }
});

test("a tile error survives style.load, and switching back to Standard clears only the old style's error", async () => {
  const { callbacks, map } = engine();
  await act(async () => root.render(<LiveMap mapKind="satellite" />));
  await act(async () => callbacks.error({ error: { status: 429 } }));
  await act(async () => callbacks["style.load"]());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "begrenser tilgangen",
  );
  await act(async () => root.render(<LiveMap mapKind="standard" />));
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(map.setStyle).toHaveBeenCalledTimes(1);
  await act(async () => callbacks.error({ error: { status: 403 } }));
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Karttilgangen ble avvist",
  );
});
