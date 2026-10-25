import { watchWorkout, watchReceipt } from "../src/features/watch/model";
import {
  importWatchWorkouts,
  type WatchPort,
} from "../src/features/watch/controller";
import type { Workout } from "../src/features/activities/model";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const start = Date.UTC(2026, 9, 24, 10);
function payload() {
  return {
    version: 1,
    id,
    ownerId: owner,
    sport: "Løping",
    startedAt: start,
    endedAt: start + 20000,
    activeSeconds: 20,
    points: [
      {
        latitude: 60,
        longitude: 10,
        timestamp: start,
        accuracy: 5,
        breakBefore: true,
      },
      {
        latitude: 60.0005,
        longitude: 10,
        timestamp: start + 10000,
        accuracy: 5,
        breakBefore: false,
      },
    ],
  };
}
function setup() {
  let current: string | undefined = owner;
  const receipts = new Set<string>(),
    workouts: Workout[] = [];
  const events: string[] = [];
  const port: WatchPort = {
    owner: () => current,
    setOwner: jest.fn(async () => {
      events.push("owner");
    }),
    pending: jest.fn(async () => [payload()]),
    received: (r) => receipts.has(r),
    save: jest.fn((w, r) => {
      workouts.push(w);
      receipts.add(r);
      events.push("save");
    }),
    persist: jest.fn(async () => {
      events.push("persist");
    }),
    acknowledge: jest.fn(async () => {
      events.push("ack");
    }),
  };
  return {
    port,
    events,
    workouts,
    receipts,
    switchOwner: (next?: string) => {
      current = next;
    },
  };
}
test("real watch coordinates determine distance; credentials, heart data and competition proof never enter the workout", () => {
  const workout = watchWorkout(
    {
      ...payload(),
      distance: 99999,
      heartRate: 170,
      token: "secret",
      turfTrace: ["untrusted"],
      visibility: "public",
    },
    owner,
  );
  expect(workout.distance).toBeCloseTo(0.0556, 4);
  expect(workout).toEqual(
    expect.objectContaining({
      id: `watch-${id}`,
      ownerId: owner,
      source: "gps",
      visibility: "private",
      seconds: 20,
    }),
  );
  expect(workout).not.toHaveProperty("heartRate");
  expect(workout).not.toHaveProperty("token");
  expect(workout).not.toHaveProperty("turfTrace");
  expect(workout.route?.[0]).not.toHaveProperty("timestamp");
});
test.each([
  ["wrong owner", { ownerId: other }],
  ["unknown format", { version: 2 }],
  ["invalid ID", { id: "../../bad" }],
  ["unsupported sport", { sport: "Fake" }],
  ["impossible time", { activeSeconds: 80 }],
  ["negative time", { activeSeconds: -1 }],
  ["no route", { points: [] }],
  ["not a GPS recording", { source: "simulation" }],
])("rejects %s without creating a workout", (_, patch) => {
  expect(() => watchWorkout({ ...payload(), ...patch }, owner)).toThrow();
});
test("invalid accuracy, out-of-range GPS, reversed time, jumps and excessive payloads are rejected", () => {
  for (const patch of [
    { accuracy: 100 },
    { accuracy: -1 },
    { latitude: 91 },
    { longitude: NaN },
    { timestamp: start - 1 },
    { timestamp: start + 30000 },
    { latitude: 61 },
  ]) {
    const value = payload();
    value.points[1] = { ...value.points[1], ...patch };
    expect(() => watchWorkout(value, owner)).toThrow();
  }
  expect(() =>
    watchWorkout(
      { ...payload(), points: Array(20001).fill(payload().points[0]) },
      owner,
    ),
  ).toThrow();
});
test("pauses and long GPS gaps create separate segments and never add the intervening distance", () => {
  const value = payload();
  value.endedAt = start + 90000;
  value.activeSeconds = 40;
  value.points.push({
    ...value.points[0],
    latitude: 61,
    timestamp: start + 70000,
    breakBefore: false,
  });
  value.points.push({
    ...value.points[1],
    latitude: 61.0005,
    timestamp: start + 80000,
  });
  const workout = watchWorkout(value, owner);
  expect(workout.distance).toBeCloseTo(0.1112, 4);
  expect(workout.route?.[2].breakBefore).toBe(true);
  value.points[2].timestamp = start + 15000;
  value.points[2].breakBefore = true;
  expect(watchWorkout(value, owner).route?.[2].breakBefore).toBe(true);
});
test("acknowledges only after persisting the private workout and its receipt", async () => {
  const s = setup();
  expect(await importWatchWorkouts(s.port)).toBe(1);
  expect(s.events).toEqual(["owner", "save", "persist", "ack"]);
  expect(s.receipts.has(watchReceipt(owner, `watch-${id}`))).toBe(true);
  expect(s.port.acknowledge).toHaveBeenCalledWith(id, owner);
});
test("duplicate delivery is acknowledged but cannot recreate a deleted workout", async () => {
  const s = setup();
  await importWatchWorkouts(s.port);
  s.workouts.length = 0;
  expect(await importWatchWorkouts(s.port)).toBe(0);
  expect(s.workouts).toHaveLength(0);
  expect(s.port.save).toHaveBeenCalledTimes(1);
  expect(s.port.acknowledge).toHaveBeenCalledTimes(2);
});
test("disk failure leaves the watch copy unacknowledged and retries persistence before acknowledging", async () => {
  const s = setup();
  jest.mocked(s.port.persist).mockRejectedValueOnce(new Error("disk full"));
  await expect(importWatchWorkouts(s.port)).rejects.toThrow("disk full");
  expect(s.port.acknowledge).not.toHaveBeenCalled();
  await importWatchWorkouts(s.port);
  expect(s.workouts).toHaveLength(1);
  expect(s.port.persist).toHaveBeenCalledTimes(2);
  expect(s.port.acknowledge).toHaveBeenCalledTimes(1);
});
test("a lost acknowledgement never imports twice", async () => {
  const s = setup();
  jest
    .mocked(s.port.acknowledge)
    .mockRejectedValueOnce(new Error("disconnected"));
  await expect(importWatchWorkouts(s.port)).rejects.toThrow();
  await importWatchWorkouts(s.port);
  expect(s.workouts).toHaveLength(1);
  expect(s.port.acknowledge).toHaveBeenCalledTimes(2);
});
test("logout while receiving a file prevents importing or acknowledging it", async () => {
  const s = setup();
  jest.mocked(s.port.pending).mockImplementationOnce(async () => {
    s.switchOwner();
    return [payload()];
  });
  await importWatchWorkouts(s.port);
  expect(s.port.save).not.toHaveBeenCalled();
  expect(s.port.acknowledge).not.toHaveBeenCalled();
  await importWatchWorkouts(s.port);
  expect(s.port.setOwner).toHaveBeenLastCalledWith("");
  expect(s.port.pending).toHaveBeenCalledTimes(1);
});
test("account switch during persistence leaves the old owner's file for a later retry", async () => {
  const s = setup();
  jest.mocked(s.port.persist).mockImplementationOnce(async () => {
    s.switchOwner(other);
  });
  await importWatchWorkouts(s.port);
  expect(s.workouts[0].ownerId).toBe(owner);
  expect(s.port.acknowledge).not.toHaveBeenCalled();
  s.switchOwner(owner);
  await importWatchWorkouts(s.port);
  expect(s.workouts).toHaveLength(1);
  expect(s.port.acknowledge).toHaveBeenCalledTimes(1);
});
test("a malformed or mismatched file is retained without an acknowledgement", async () => {
  const s = setup();
  jest
    .mocked(s.port.pending)
    .mockResolvedValue([{ ...payload(), ownerId: other }]);
  await expect(importWatchWorkouts(s.port)).rejects.toThrow();
  expect(s.port.save).not.toHaveBeenCalled();
  expect(s.port.acknowledge).not.toHaveBeenCalled();
});
