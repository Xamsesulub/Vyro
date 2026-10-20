import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppStore } from "../src/stores/useAppStore";
import { initialRecording } from "../src/features/tracking/simulator";

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppStore.setState({
    workouts: [],
    recording: initialRecording,
    storageError: null,
  });
});

test("light redesign migrates old profiles without losing workouts or preferences", async () => {
  const workout = {
    id: "sim-existing",
    title: "Behold meg",
    sport: "Løping",
    distance: 2,
    seconds: 600,
    date: "2026-10-19T10:00:00Z",
    source: "simulation",
    visibility: "private",
  };
  await AsyncStorage.setItem(
    "vyro-prototype-v1",
    JSON.stringify({
      version: 0,
      state: {
        theme: "dark",
        name: "Test",
        goal: 30,
        workouts: [workout],
        recording: initialRecording,
      },
    }),
  );
  await useAppStore.persist.rehydrate();
  expect(useAppStore.getState()).toMatchObject({
    theme: "light",
    name: "Test",
    goal: 30,
    workouts: [workout],
  });
  useAppStore.getState().preferences({ theme: "dark" });
  await useAppStore.persist.rehydrate();
  expect(useAppStore.getState().theme).toBe("dark");
});
test("save is private and idempotent, and clears the pending session", () => {
  useAppStore.setState({
    recording: {
      ...initialRecording,
      status: "finishing",
      seconds: 60,
      route: [
        [
          { latitude: 59.9, longitude: 10.7 },
          { latitude: 59.901, longitude: 10.7 },
        ],
      ],
      distance: 0.2,
    },
  });
  const id = useAppStore.getState().save(" Test ", " Note ");
  expect(id).toBeTruthy();
  expect(useAppStore.getState().save("Duplicate", "")).toBeNull();
  expect(useAppStore.getState().workouts).toHaveLength(1);
  expect(useAppStore.getState().workouts[0]).toMatchObject({
    title: "Test",
    notes: "Note",
    source: "gps",
    visibility: "private",
  });
  expect(useAppStore.getState().recording.status).toBe("idle");
});
test("sport cannot change while recording and empty sessions cannot save", () => {
  useAppStore.getState().event("start");
  useAppStore.getState().sport("Sykling");
  expect(useAppStore.getState().recording.sport).toBe("Løping");
  useAppStore.setState({
    recording: { ...initialRecording, status: "finishing" },
  });
  expect(useAppStore.getState().save("", "")).toBeNull();
});
test("a simulated session is saved as a simulation, never as GPS", () => {
  useAppStore.setState({
    recording: {
      ...initialRecording,
      mode: "simulation",
      status: "finishing",
      seconds: 60,
      route: [
        [
          { latitude: 59.9, longitude: 10.7 },
          { latitude: 59.901, longitude: 10.7 },
        ],
      ],
      distance: 0.2,
    },
  });
  useAppStore.getState().save("", "");
  expect(useAppStore.getState().workouts[0].source).toBe("simulation");
  expect(useAppStore.getState().recording.mode).toBe("simulation");
});
test("mode cannot change while recording", () => {
  useAppStore.getState().event("start");
  useAppStore.getState().mode("simulation");
  expect(useAppStore.getState().recording.mode).toBe("gps");
});
test("GPS routes survive local persistence for recovery and sharing", async () => {
  useAppStore.setState({
    recording: {
      ...initialRecording,
      status: "paused",
      seconds: 30,
      distance: 0.1,
      route: [[{ latitude: 59.9, longitude: 10.7 }]],
    },
  });
  const raw = await AsyncStorage.getItem("vyro-prototype-v1");
  expect(raw).toContain("59.9");
  expect(JSON.parse(raw!).state.recording.route).toEqual([
    [{ latitude: 59.9, longitude: 10.7 }],
  ]);
});
test("persists an interrupted simulation as paused with no background time", async () => {
  useAppStore.setState({
    recording: {
      ...initialRecording,
      status: "recording",
      startedAt: Date.now(),
      seconds: 30,
      distance: 0.1,
    },
  });
  const raw = await AsyncStorage.getItem("vyro-prototype-v1");
  expect(JSON.parse(raw!).state.recording).toMatchObject({
    status: "paused",
    seconds: 30,
    startedAt: null,
  });
  await useAppStore.persist.rehydrate();
  expect(useAppStore.getState().recording.status).toBe("paused");
});

test("a persistent storage failure reports an error without a write loop", async () => {
  const write = jest.mocked(AsyncStorage.setItem);
  write.mockRejectedValue(new Error("Disk full"));
  write.mockClear();
  useAppStore.getState().preferences({ name: "Storage test" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(useAppStore.getState().storageError).toContain("Lokal lagring feilet");
  expect(write.mock.calls.length).toBeLessThanOrEqual(2);
  write.mockResolvedValue(undefined);
});

test("saved GPS routes keep pause boundaries after rehydration", async () => {
  const route = [
    [
      { latitude: 59.9, longitude: 10.7 },
      { latitude: 59.901, longitude: 10.7 },
    ],
    [
      { latitude: 59.95, longitude: 10.7 },
      { latitude: 59.951, longitude: 10.7 },
    ],
  ];
  useAppStore.setState({
    recording: {
      ...initialRecording,
      status: "finishing",
      seconds: 60,
      distance: 0.2,
      route,
    },
  });
  const id = useAppStore.getState().save("GPS", "");
  await useAppStore.persist.rehydrate();
  expect(
    useAppStore.getState().workouts.find((w) => w.id === id)?.route,
  ).toEqual([
    route[0][0],
    route[0][1],
    { ...route[1][0], breakBefore: true },
    route[1][1],
  ]);
});
