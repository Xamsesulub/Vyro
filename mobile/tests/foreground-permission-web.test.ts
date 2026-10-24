import { requestForegroundPermission } from "../src/features/tracking/foregroundPermission.web";
import { watchPosition } from "../src/features/tracking/watchPosition.web";
import { locationDeadline } from "../src/features/tracking/locationDeadline";

const originalNavigator = Object.getOwnPropertyDescriptor(
  globalThis,
  "navigator",
);
let permission: {
  state: PermissionState;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
};
let geo: {
  getCurrentPosition: jest.Mock;
  watchPosition: jest.Mock;
  clearWatch: jest.Mock;
};
beforeEach(() => {
  jest.useFakeTimers();
  permission = {
    state: "prompt",
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  geo = {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(() => 17),
    clearWatch: jest.fn(),
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      permissions: { query: jest.fn(async () => permission) },
      geolocation: geo,
    },
  });
});
afterEach(() => {
  jest.useRealTimers();
  if (originalNavigator)
    Object.defineProperty(globalThis, "navigator", originalNavigator);
  else Reflect.deleteProperty(globalThis, "navigator");
});

test("granting permission resolves immediately while GPS is still pending", async () => {
  const pending = requestForegroundPermission();
  await Promise.resolve();
  expect(geo.getCurrentPosition).toHaveBeenCalled();
  permission.state = "granted";
  permission.addEventListener.mock.calls[0][1]();
  await expect(pending).resolves.toMatchObject({ granted: true });
  expect(permission.removeEventListener).toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test("an already granted permission does not wait for or request a GPS fix", async () => {
  permission.state = "granted";
  await expect(requestForegroundPermission()).resolves.toMatchObject({
    granted: true,
  });
  expect(geo.getCurrentPosition).not.toHaveBeenCalled();
});

test("a hung permission query times out and a late answer cannot request location", async () => {
  let resolve!: (value: typeof permission) => void;
  jest.mocked(navigator.permissions.query).mockReturnValueOnce(
    new Promise((done) => {
      resolve = (value) => done(value as unknown as PermissionStatus);
    }),
  );
  const pending = requestForegroundPermission();
  const assertion = expect(pending).rejects.toThrow("Posisjon svarte ikke");
  await jest.advanceTimersByTimeAsync(15_000);
  await assertion;
  resolve(permission);
  await Promise.resolve();
  expect(geo.getCurrentPosition).not.toHaveBeenCalled();
});

test("dismissed permission has a deadline; late GPS success is ignored", async () => {
  const pending = requestForegroundPermission();
  const assertion = expect(pending).rejects.toThrow("Posisjon svarte ikke");
  await jest.advanceTimersByTimeAsync(15_000);
  await assertion;
  geo.getCurrentPosition.mock.calls[0][0]({});
  expect(permission.removeEventListener).toHaveBeenCalled();
});

test("browser denial is distinct from a timeout", async () => {
  permission.state = "denied";
  await expect(requestForegroundPermission()).resolves.toEqual({
    granted: false,
    canAskAgain: false,
  });
});

test("browsers without the Permissions API still support a bounded location request", async () => {
  Object.defineProperty(navigator, "permissions", { value: undefined });
  const pending = requestForegroundPermission();
  expect(geo.getCurrentPosition.mock.calls[0][2].timeout).toBe(12_000);
  geo.getCurrentPosition.mock.calls[0][0]({});
  await expect(pending).resolves.toMatchObject({ granted: true });
});

test("native permission and background operations also have a deadline", async () => {
  const pending = locationDeadline(new Promise(() => {}));
  const assertion = expect(pending).rejects.toThrow("Posisjon svarte ikke");
  await jest.advanceTimersByTimeAsync(15_000);
  await assertion;
  expect(jest.getTimerCount()).toBe(0);
});

test("GPS watcher requests browser high accuracy, reports errors and rejects callbacks after removal", async () => {
  const fix = jest.fn(),
    failed = jest.fn();
  const sub = await watchPosition(fix, failed);
  expect(geo.watchPosition.mock.calls[0][2]).toEqual({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 20_000,
  });
  const [position, error] = geo.watchPosition.mock.calls[0];
  const sample = {
    coords: { latitude: 59, longitude: 10, accuracy: 5 },
    timestamp: 100,
  };
  position(sample);
  error();
  expect(fix).toHaveBeenCalledTimes(1);
  expect(failed).toHaveBeenCalledTimes(1);
  sub.remove();
  position(sample);
  error();
  expect(fix).toHaveBeenCalledTimes(1);
  expect(failed).toHaveBeenCalledTimes(1);
  expect(geo.clearWatch).toHaveBeenCalledWith(17);
});
