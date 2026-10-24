import { geocodeAsync, requestForegroundPermissionsAsync } from "expo-location";
import { searchPlaces } from "../src/features/maps/search";

jest.mock("expo-location", () => ({
  geocodeAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

test("iOS searches a typed address through Apple's geocoder without collecting location", async () => {
  jest
    .mocked(geocodeAsync)
    .mockResolvedValue([{ latitude: 59.9, longitude: 10.7 }]);
  const result = await searchPlaces(
    "  Storgata 1, Oslo  ",
    new AbortController().signal,
  );
  expect(geocodeAsync).toHaveBeenCalledWith("Storgata 1, Oslo");
  expect(result[0]).toMatchObject({
    name: "Storgata 1, Oslo",
    latitude: 59.9,
    longitude: 10.7,
  });
  expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test("aborted or empty searches do not query Apple", async () => {
  const abort = new AbortController();
  abort.abort();
  await expect(searchPlaces("Oslo", abort.signal)).rejects.toThrow("avbrutt");
  await expect(
    searchPlaces("  ", new AbortController().signal),
  ).resolves.toEqual([]);
  expect(geocodeAsync).not.toHaveBeenCalled();
});

test("cancelling an active lookup discards a later native response", async () => {
  let complete!: (value: Awaited<ReturnType<typeof geocodeAsync>>) => void;
  jest.mocked(geocodeAsync).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const abort = new AbortController();
  const pending = searchPlaces("Oslo", abort.signal);
  const rejected = expect(pending).rejects.toThrow("avbrutt");
  abort.abort();
  await rejected;
  complete([{ latitude: 59.9, longitude: 10.7 }]);
  expect(jest.getTimerCount()).toBe(0);
});

test("a stalled native geocoder cannot leave search permanently busy", async () => {
  jest.mocked(geocodeAsync).mockImplementation(() => new Promise(() => {}));
  const pending = expect(
    searchPlaces("Oslo", new AbortController().signal),
  ).rejects.toThrow("for lang tid");
  await jest.advanceTimersByTimeAsync(12_000);
  await pending;
  expect(jest.getTimerCount()).toBe(0);
});
