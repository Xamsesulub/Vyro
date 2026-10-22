import { workoutGpx } from "../src/features/activities/gpx";
import type { Workout } from "../src/features/activities/model";

const workout: Workout = {
  id: "gps-1",
  ownerId: "a",
  title: 'Tur <ved> "elva" & skog\u0000',
  notes: "Private notes",
  sport: "Løping",
  distance: 2,
  seconds: 600,
  date: "2026-10-22T10:00:00Z",
  visibility: "private",
  source: "gps",
  route: [
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.901, longitude: 10.7 },
    { latitude: 60, longitude: 11, breakBefore: true },
    { latitude: 60.001, longitude: 11 },
  ],
};
test("exports valid escaped GPX with separate pause segments, no notes or fabricated timestamps", () => {
  const file = workoutGpx(workout, "a");
  expect(file.filename).toBe("vyro-gps-1.gpx");
  expect(file.contents).toContain(
    "Tur &lt;ved&gt; &quot;elva&quot; &amp; skog",
  );
  expect(file.contents.match(/<trkseg>/g)).toHaveLength(2);
  expect(file.contents.match(/<trkpt /g)).toHaveLength(4);
  expect(file.contents).not.toContain("Private notes");
  expect(file.contents).not.toContain("<time>");
  expect(file.contents).not.toContain("\u0000");
});
test("rejects simulations, examples, guest exports, other accounts and invalid coordinates", () => {
  for (const source of ["example", "simulation"] as const)
    expect(() => workoutGpx({ ...workout, source }, "a")).toThrow();
  for (const user of [undefined, "b"])
    expect(() => workoutGpx(workout, user)).toThrow();
  for (const latitude of [NaN, Infinity, 91])
    expect(() =>
      workoutGpx(
        { ...workout, route: [{ latitude, longitude: 0 }, workout.route![0]] },
        "a",
      ),
    ).toThrow();
});
