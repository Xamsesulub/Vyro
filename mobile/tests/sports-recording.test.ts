import type { Session } from "@supabase/supabase-js";
import {
  sports,
  sportInfo,
  sportSections,
} from "../src/features/activities/sports";
import { useAppStore, appPersistence } from "../src/stores/useAppStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import {
  initialRecording,
  snapshot,
  transition,
} from "../src/features/tracking/simulator";
import { backupPayload, validBackup } from "../src/features/backup/model";
import { ownTraining, goalProgress } from "../src/features/activities/training";
import { workoutActivityProps } from "../src/features/tracking/liveActivityModel";
jest.mock("../src/lib/workoutStorage", () => ({
  workoutStorage: require("@react-native-async-storage/async-storage"),
}));

beforeEach(() => {
  useAuthStore.setState({
    session: { user: { id: "runner" } } as Session,
    ready: true,
  });
  useAppStore.setState({
    recording: initialRecording,
    workouts: [],
    ready: true,
  });
});

test("the reported football trip shows 5.6 km/h; the same distance and time running show 10:43 min/km", () => {
  const r = {
    ...initialRecording,
    status: "paused" as const,
    seconds: 425,
    distance: 0.66,
  };
  expect(
    workoutActivityProps({ ...r, sport: "Fotball" }, 0, null, 0),
  ).toMatchObject({
    pace: "5,6",
    paceLabel: "Snitt km/t",
    seconds: "07:05",
    distance: "0,66",
  });
  expect(
    workoutActivityProps({ ...r, sport: "Løping" }, 0, null, 0),
  ).toMatchObject({
    pace: "10:43",
    paceLabel: "Snitt /km",
  });
});

test.each(sports)(
  "%s can select, record, save and privately back up with its actual measurement mode",
  async (sport) => {
    const store = useAppStore.getState;
    store().sport(sport);
    expect(store().recording.mode).toBe(sportInfo(sport).gps ? "gps" : "timer");
    store().event("start");
    const r = store().recording;
    useAppStore.setState({
      recording: transition(
        {
          ...snapshot(r, r.startedAt! + 60000),
          ...(sportInfo(sport).gps
            ? {
                distance: 0.2,
                route: [
                  [
                    { latitude: 59.9, longitude: 10.7 },
                    { latitude: 59.901, longitude: 10.7 },
                  ],
                ],
              }
            : {}),
        },
        "finish",
        r.startedAt! + 60000,
      ),
    });
    expect(
      store().save("Morgentrening", "Min private merknad", {
        workoutType: "Trening",
        effort: 6,
      }),
    ).toBeTruthy();
    const workout = store().workouts[0];
    expect(workout).toMatchObject({
      ownerId: "runner",
      visibility: "private",
      sport,
      seconds: 60,
      effort: 6,
      workoutType: "Trening",
    });
    expect(workout.distance).toBe(sportInfo(sport).gps ? 0.2 : 0);
    if (!sportInfo(sport).gps) expect(workout.route).toEqual([]);
    const payload = backupPayload(workout, "runner");
    expect(
      validBackup(JSON.parse(JSON.stringify(payload)), "runner", workout.id),
    ).toBe(true);
    expect(validBackup(payload, "other", workout.id)).toBe(false);
    await appPersistence.flush();
  },
);

test("timer pause, return from save, and resume exclude paused time and never add distance", () => {
  let r = transition(
    { ...initialRecording, sport: "Yoga", mode: "timer" },
    "start",
    1000,
  );
  r = transition(r, "pause", 61000);
  expect(snapshot(r, 121000).seconds).toBe(60);
  r = transition(r, "resume", 121000);
  r = transition(r, "finish", 181000);
  r = transition(r, "return", 241000);
  expect(r).toMatchObject({
    status: "paused",
    seconds: 120,
    distance: 0,
    startedAt: null,
  });
  const props = workoutActivityProps(r, 241000, "file:///old-gps.png", 1000);
  expect(props).toMatchObject({
    timerOnly: true,
    mapUri: null,
    mapTime: "",
    paused: true,
  });
});

test("timer recordings remain private across account changes and count in minutes goals only", () => {
  useAppStore.setState({
    recording: {
      ...initialRecording,
      mode: "timer",
      sport: "Yoga",
      ownerId: "runner",
      seconds: 600,
      status: "finishing",
    },
  });
  useAuthStore.setState({ session: { user: { id: "other" } } as Session });
  expect(useAppStore.getState().save("Yoga", "")).toBeNull();
  useAuthStore.setState({ session: { user: { id: "runner" } } as Session });
  expect(useAppStore.getState().save("Yoga", "", { effort: 11 })).toBeNull();
  useAppStore.getState().save("Yoga", "");
  const workouts = useAppStore.getState().workouts;
  expect(ownTraining(workouts, "other")).toHaveLength(0);
  expect(
    goalProgress(
      workouts,
      { kind: "minutes", sport: "Yoga", target: 30 },
      "runner",
    ).value,
  ).toBe(10);
  expect(
    goalProgress(
      workouts,
      { kind: "distance", sport: "Alle", target: 30 },
      "runner",
    ).value,
  ).toBe(0);
});

test("Norwegian sport search and favorites do not duplicate or lose choices", () => {
  expect(sportSections("  SKØYTER ").flatMap((s) => s.data)).toEqual([
    "Skøyter",
    "Rulleskøyter",
  ]);
  const sections = sportSections("", ["Yoga", "Fotball"]);
  expect(sections[0].title).toBe("Dine idretter");
  expect(new Set(sections.flatMap((s) => s.data)).size).toBe(sports.length);
  expect(sections.flatMap((s) => s.data)).toHaveLength(sports.length);
  expect(sportSections("finnes ikke")).toEqual([]);
});
