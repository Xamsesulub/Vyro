import {
  initialRecording,
  snapshot,
  transition,
} from "../src/features/tracking/simulator";
import {
  duration,
  pace,
  total,
  weekWorkouts,
  Workout,
} from "../src/features/activities/model";

const sim = { ...initialRecording, mode: "simulation" as const };
describe("simulator lifecycle", () => {
  test("only records elapsed time while running", () => {
    const running = transition(sim, "start", 1000);
    const paused = transition(running, "pause", 61000);
    expect(paused.seconds).toBe(60);
    expect(paused.distance).toBeCloseTo(1 / 6);
    expect(snapshot(paused, 121000)).toEqual(paused);
    const resumed = transition(paused, "resume", 121000);
    const finished = transition(resumed, "finish", 181000);
    expect(finished.seconds).toBe(120);
    expect(finished.distance).toBeCloseTo(1 / 3);
    expect(finished.startedAt).toBeNull();
  });
  test("GPS mode never adds simulated distance", () => {
    const running = transition(initialRecording, "start", 1000);
    const paused = transition(running, "pause", 61000);
    expect(paused.seconds).toBe(60);
    expect(paused.distance).toBe(0);
  });
  test("invalid transitions cannot reset or restart a session", () => {
    expect(transition(initialRecording, "resume")).toEqual(initialRecording);
    expect(transition(initialRecording, "finish")).toEqual(initialRecording);
    const recording = transition(initialRecording, "start", 10);
    expect(transition(recording, "start", 100)).toEqual(recording);
    const finished = transition(recording, "finish", 1000);
    expect(transition(finished, "resume")).toEqual(finished);
  });
  test("pausing twice and clock rollback never inflate time", () => {
    const recording = transition(initialRecording, "start", 10000);
    expect(snapshot(recording, 9000).seconds).toBe(0);
    const paused = transition(recording, "pause", 20000);
    expect(transition(paused, "pause", 30000)).toEqual(paused);
  });
  test("discard clears metrics but retains sport", () => {
    expect(
      transition(
        { ...sim, sport: "Sykling", seconds: 90, distance: 2 },
        "discard",
      ),
    ).toEqual({ ...sim, sport: "Sykling" });
  });
});
describe("metrics", () => {
  test("formats pace safely for an empty or completed session", () => {
    expect(pace(0, 0)).toBe("—");
    expect(pace(5, 1500)).toBe("05:00");
    expect(duration(61)).toBe("01:01");
  });
  test("weekly statistics start on local Monday and exclude the future", () => {
    const base: Workout = {
      id: "test",
      sport: "Løping",
      title: "",
      notes: "",
      date: "",
      distance: 5,
      seconds: 1500,
      source: "simulation",
      visibility: "private",
    };
    const values = [
      "2026-10-18T12:00:00",
      "2026-10-19T10:00:00",
      "2026-10-20T10:00:00",
    ].map((date) => ({ ...base, date }));
    const week = weekWorkouts(values, new Date("2026-10-19T12:00:00"));
    expect(week).toHaveLength(1);
    expect(total(week)).toEqual({ distance: 5, seconds: 1500 });
  });
});
