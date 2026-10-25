import { duration, km, pace } from "../src/features/activities/model";
import { addFix } from "../src/features/tracking/gps";
import { initialRecording, transition } from "../src/features/tracking/simulator";

// Illustrative full-precision inputs compatible with the screenshots, not the
// user's original GPS measurements (which cannot be recovered from an image).
test.each([
  [0.1073, 73, "0,11", "01:13", "11:20"],
  [0.1486, 102, "0,15", "01:42", "11:26"],
  [0.2057, 141, "0,21", "02:21", "11:25"],
  [0.5455, 358, "0,55", "05:58", "10:56"],
])(
  "keeps full precision for pace at %s km / %s seconds",
  (distance, seconds, shownKm, shownTime, shownPace) => {
    expect(km(distance)).toBe(shownKm);
    expect(duration(seconds)).toBe(shownTime);
    expect(pace(distance, seconds)).toBe(shownPace);
  },
);

test("GPS average uses total active time and distance across different speeds and a pause", () => {
  const start = 1_000_000;
  // Synthetic meridian points on a 6,371 km sphere, not a field GPS test.
  const fix = (meters: number, seconds: number) => ({
    latitude: 59 + meters / 111194.92664455874,
    longitude: 10,
    accuracy: 5,
    timestamp: start + seconds * 1000,
  });
  let recording = transition(initialRecording, "start", start);
  // First 300 m at 1 m/s.
  for (let seconds = 0; seconds <= 300; seconds += 5)
    recording = addFix(recording, fix(seconds, seconds));
  recording = transition(recording, "pause", start + 300_000);
  expect(recording.distance).toBeCloseTo(0.3, 8);
  const paused = recording;
  expect(addFix(paused, fix(800, 400))).toBe(paused);
  // A two-minute pause and movement during the pause must count as neither
  // exercise time nor exercise distance. Then 200 m at 2 m/s.
  recording = transition(recording, "resume", start + 420_000);
  for (let seconds = 0; seconds <= 100; seconds += 5)
    recording = addFix(recording, fix(1000 + seconds * 2, 420 + seconds));
  recording = transition(recording, "finish", start + 520_250);
  expect(recording.seconds).toBe(400.25);
  expect(recording.distance).toBeCloseTo(0.5, 8);
  expect(recording.route).toHaveLength(2);
  expect(pace(recording.distance, recording.seconds)).toBe("13:20");
  // Averaging the two segment paces (16:40 and 08:20) would incorrectly give 12:30.
});
