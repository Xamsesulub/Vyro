import { JSDOM } from "jsdom";
import { act, type ReactNode } from "react";
import LiveMap from "../src/components/LiveMap.web";
import { loadMapEngine } from "../src/features/maps/prewarm.web";

jest.mock("react-native", () => ({ View: "div" }));
jest.mock("../src/components/ui", () => ({ Txt: "span" }));
jest.mock("../src/components/MapLoadNotice", () => ({
  MapLoadNotice: ({ message }: { message: string }) => (
    <div role="alert">{message}</div>
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
  const map = {
    on: jest.fn((event: string, callback: (event?: unknown) => void) => {
      callbacks[event] = callback;
    }),
    addControl: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    getSource: jest.fn((name: string) =>
      name === "workout" ? source : undefined,
    ),
    getLayer: jest.fn(),
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
  };
  jest.mocked(loadMapEngine).mockResolvedValue({
    default: { Map: jest.fn(() => map), NavigationControl: jest.fn() },
  } as unknown as Awaited<ReturnType<typeof loadMapEngine>>);
  return { callbacks, map, config, source };
}

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
