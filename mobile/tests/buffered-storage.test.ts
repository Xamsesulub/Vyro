import { bufferedStorage } from "../src/lib/bufferedStorage";

function setup() {
  type State = { seconds: number; status: string };
  const storage = {
    getItem: jest.fn(async (): Promise<string | null> => null),
    setItem: jest.fn(async (_key: string, _value: string) => {}),
    removeItem: jest.fn(async () => {}),
  };
  const onError = jest.fn();
  const encode = jest.fn(JSON.stringify);
  const adapter = bufferedStorage<State>(storage, {
    delayMs: 5_000,
    defer: (a, b) => a.status === "recording" && b.status === "recording",
    onError,
    onSuccess: jest.fn(),
    encode,
  });
  const set = (seconds: number, status = "recording") =>
    adapter.setItem("app", { state: { seconds, status }, version: 2 });
  return { storage, adapter, set, onError, encode };
}
afterEach(() => jest.useRealTimers());

test("coalesces 500 GPS/timer updates into one serialized checkpoint and flushes pause immediately", async () => {
  jest.useFakeTimers();
  const s = setup();
  await s.adapter.getItem("app");
  s.set(0);
  await s.adapter.flush();
  await jest.advanceTimersByTimeAsync(1_000);
  for (let i = 1; i <= 500; i++) s.set(i);
  expect(s.encode).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(4_000);
  expect(s.storage.setItem).toHaveBeenCalledTimes(2);
  expect(JSON.parse(s.storage.setItem.mock.calls[1][1]).state.seconds).toBe(
    500,
  );
  s.set(501);
  s.set(502, "paused");
  await s.adapter.flush();
  expect(JSON.parse(s.storage.setItem.mock.calls.at(-1)![1]).state).toEqual({
    seconds: 502,
    status: "paused",
  });
});

test("a slow disk never accumulates an unbounded queue or overwrites a completed workout with an old checkpoint", async () => {
  const s = setup();
  await s.adapter.getItem("app");
  let release!: () => void;
  s.storage.setItem.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  s.set(0);
  await Promise.resolve();
  for (let i = 1; i <= 1_000; i++) s.set(i);
  s.set(1_000, "saved");
  expect(s.storage.setItem).toHaveBeenCalledTimes(1);
  release();
  await s.adapter.flush();
  expect(s.storage.setItem).toHaveBeenCalledTimes(2);
  expect(JSON.parse(s.storage.setItem.mock.calls[1][1]).state.status).toBe(
    "saved",
  );
});

test("failed decoding locks writes and deletes until successful recovery", async () => {
  const s = setup();
  s.storage.getItem.mockResolvedValueOnce("broken");
  await expect(s.adapter.getItem("app")).rejects.toThrow();
  s.set(0);
  await s.adapter.flush();
  await expect(s.adapter.removeItem("app")).rejects.toThrow();
  expect(s.storage.setItem).not.toHaveBeenCalled();
  expect(s.storage.removeItem).not.toHaveBeenCalled();
  await s.adapter.getItem("app");
  s.set(1);
  await s.adapter.flush();
  expect(s.storage.setItem).toHaveBeenCalledTimes(1);
});

test("write failure is reported once, manual retry saves the latest state", async () => {
  const s = setup();
  await s.adapter.getItem("app");
  s.storage.setItem.mockRejectedValueOnce(new Error("full"));
  s.set(1);
  await s.adapter.flush();
  expect(s.onError).toHaveBeenCalledTimes(1);
  s.set(2);
  await s.adapter.retry();
  expect(s.storage.setItem).toHaveBeenCalledTimes(2);
  expect(JSON.parse(s.storage.setItem.mock.calls[1][1]).state.seconds).toBe(2);
});
