import {
  createWorkoutActivityController,
  type WorkoutActivity,
  type WorkoutActivityPort,
} from "../src/features/tracking/liveActivityController";
import {
  snapshotRoute,
  workoutActivityProps,
  type WorkoutPresentation,
} from "../src/features/tracking/liveActivityModel";
import {
  initialRecording,
  transition,
} from "../src/features/tracking/simulator";

const route = [
  [
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.901, longitude: 10.7 },
  ],
];
let time: number;
let state: WorkoutPresentation;
let instances: WorkoutActivity[];
let activity: WorkoutActivity;
let port: WorkoutActivityPort;
let controller: ReturnType<typeof createWorkoutActivityController>;
beforeEach(() => {
  time = 1000000;
  state = {
    ready: true,
    enabled: true,
    foreground: true,
    userId: "a",
    recording: {
      ...transition(initialRecording, "start", time),
      ownerId: "a",
      distance: 1,
      seconds: 300,
      route,
    },
  };
  instances = [];
  activity = {
    getId: () => "activity",
    update: jest.fn(async () => {}),
    end: jest.fn(async () => {
      instances = [];
    }),
  };
  port = {
    instances: () => instances,
    start: jest.fn(() => {
      instances = [activity];
      return activity;
    }),
    renderMap: jest.fn(async () => "file:///private-map.png"),
    clearMaps: jest.fn(async () => {}),
    error: jest.fn(),
  };
  controller = createWorkoutActivityController(
    () => state,
    port,
    () => time,
  );
});
afterEach(async () => {
  await controller.dispose();
});
async function flush() {
  await controller.request();
  await Promise.resolve();
  await controller.request();
}

test.each([
  "simulation",
  "wrong owner",
  "disabled",
  "not ready",
  "background",
  "restored paused",
])("never starts an activity for %s", async (reason) => {
  if (reason === "simulation") state.recording.mode = "simulation";
  if (reason === "wrong owner") state.userId = "b";
  if (reason === "disabled") state.enabled = false;
  if (reason === "not ready") state.ready = false;
  if (reason === "background") state.foreground = false;
  if (reason === "restored paused") state.recording.status = "paused";
  await flush();
  expect(port.start).not.toHaveBeenCalled();
  expect(port.renderMap).not.toHaveBeenCalled();
});
test("start, throttled updates, pause, resume and finish follow the real workout", async () => {
  await flush();
  expect(port.start).toHaveBeenCalledTimes(1);
  expect(port.renderMap).toHaveBeenCalledTimes(1);
  expect(activity.update).toHaveBeenLastCalledWith(
    expect.objectContaining({
      mapUri: "file:///private-map.png",
      pace: "05:00",
    }),
    expect.any(Date),
  );
  const calls = jest.mocked(activity.update).mock.calls.length;
  time += 1000;
  await flush();
  expect(activity.update).toHaveBeenCalledTimes(calls);
  state.recording = transition(state.recording, "pause", time);
  await flush();
  expect(activity.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ paused: true, seconds: "05:01" }),
    expect.any(Date),
  );
  time += 120000;
  state.recording = transition(state.recording, "resume", time);
  await flush();
  expect(activity.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ paused: false, timerStart: time - 301000 }),
    expect.any(Date),
  );
  state.recording = transition(state.recording, "finish", time);
  await flush();
  expect(activity.end).toHaveBeenCalledWith("immediate");
  expect(port.clearMaps).toHaveBeenCalledTimes(2);
});
test("finish and logout do not wait for slow map tiles or revive a late map", async () => {
  let resolve!: (uri: string) => void;
  jest.mocked(port.renderMap).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  await flush();
  state.userId = undefined;
  await flush();
  expect(activity.end).toHaveBeenCalledWith("immediate");
  const updates = jest.mocked(activity.update).mock.calls.length;
  resolve("file:///late-private-map.png");
  await flush();
  expect(activity.update).toHaveBeenCalledTimes(updates);
});
test("dismissal is respected and denied ActivityKit permission never breaks GPS", async () => {
  await flush();
  instances = [];
  await flush();
  time += 60000;
  await flush();
  expect(port.start).toHaveBeenCalledTimes(1);
  state.recording = initialRecording;
  await flush();
  state.recording = {
    ...transition(initialRecording, "start", time),
    ownerId: "a",
  };
  jest.mocked(port.start).mockImplementation(() => {
    throw new Error("denied");
  });
  await flush();
  await flush();
  expect(port.start).toHaveBeenCalledTimes(2);
  expect(port.error).toHaveBeenCalledWith(
    expect.stringContaining("Liveaktiviteter"),
  );
  expect(state.recording.status).toBe("recording");
});
test("cold start removes previous activities and direct account switch clears private maps", async () => {
  const old = {
    ...activity,
    getId: () => "old",
    end: jest.fn(async () => {
      instances = [];
    }),
  };
  instances = [old];
  await flush();
  expect(old.end).toHaveBeenCalledWith("immediate");
  state.userId = "b";
  state.recording = { ...state.recording, ownerId: "b", route: [] };
  await flush();
  expect(activity.end).toHaveBeenCalledTimes(1);
  expect(port.start).toHaveBeenCalledTimes(2);
  expect(jest.mocked(port.start).mock.calls[1][0].mapUri).toBeNull();
});
test("a map timeout can retry without requiring the user to move", async () => {
  jest.mocked(port.renderMap).mockResolvedValueOnce(null);
  await flush();
  expect(port.renderMap).toHaveBeenCalledTimes(1);
  time += 30000;
  await flush();
  expect(port.renderMap).toHaveBeenCalledTimes(2);
});

test("rapid off/on while the old display is ending creates exactly one replacement", async () => {
  await flush();
  let ended!: () => void;
  jest.mocked(activity.end).mockImplementationOnce(async () => {
    await new Promise<void>((resolve) => {
      ended = resolve;
    });
    instances = [];
  });
  state.enabled = false;
  const disabling = controller.request();
  state.enabled = true;
  void controller.request();
  ended();
  await disabling;
  await flush();
  expect(port.start).toHaveBeenCalledTimes(2);
  expect(instances).toHaveLength(1);
  expect(state.recording.status).toBe("recording");
});
test("logout while ActivityKit update is pending never starts another map snapshot", async () => {
  let resolve!: () => void;
  jest.mocked(activity.update).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const first = controller.request();
  // Let initial cleanup and start complete until the first update is waiting.
  for (let n = 0; n < 6; n++) await Promise.resolve();
  expect(activity.update).toHaveBeenCalledTimes(1);
  state.userId = undefined;
  void controller.request();
  resolve();
  await first;
  await flush();
  expect(port.renderMap).not.toHaveBeenCalled();
  expect(activity.end).toHaveBeenCalledWith("immediate");
});
test("pace waits for the first 100 metres instead of displaying GPS drift as extreme pace", () => {
  expect(
    workoutActivityProps({ ...state.recording, distance: 0.01 }, time, null, 0)
      .pace,
  ).toBe("—");
  expect(
    workoutActivityProps({ ...state.recording, distance: 0.1 }, time, null, 0)
      .pace,
  ).toBe("50:00");
});

test("payload stays small; no coordinates, email or owner enter ActivityKit props", () => {
  const props = workoutActivityProps(state.recording, time, null, 0);
  expect(props.pace).toBe("05:00");
  expect(JSON.stringify(props).length).toBeLessThan(1024);
  expect(props).not.toHaveProperty("route");
  expect(props).not.toHaveProperty("ownerId");
  expect(
    snapshotRoute([
      Array.from({ length: 300 }, (_, n) => ({
        latitude: 59 + n / 10000,
        longitude: 10,
      })),
      route[0],
    ]),
  ).toEqual([
    Array.from({ length: 238 }, (_, n) => ({
      latitude: 59 + (n + 62) / 10000,
      longitude: 10,
    })),
    route[0],
  ]);
});
