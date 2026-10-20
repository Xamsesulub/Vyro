import { evaluateTurf, Turf, Sample } from "../src/features/turf/rules";
const checkpoints = Array.from({ length: 5 }, (_, i) => ({
  latitude: 59.93 + i * 0.0005,
  longitude: 10.75,
}));
const turf: Turf = { id: "t", name: "Testløype", sport: "Løping", checkpoints };
const samples: Sample[] = checkpoints.map((p, i) => ({
  ...p,
  timestamp: 1000 + i * 10000,
  accuracy: 5,
}));
test("same full course: faster wins, tie retains owner; extra distance after finish is excluded", () => {
  expect(evaluateTurf(turf, samples, "gps", "Løping", 45)).toMatchObject({
    eligible: true,
    takesOver: true,
    seconds: 40,
  });
  expect(evaluateTurf(turf, samples, "gps", "Løping", 40).takesOver).toBe(
    false,
  );
  expect(
    evaluateTurf(
      turf,
      [
        ...samples,
        { latitude: 60, longitude: 11, timestamp: 90000, accuracy: 5 },
      ],
      "gps",
      "Løping",
      45,
    ).seconds,
  ).toBe(40);
});
test("rejects simulations, another sport, reversed/incomplete route and inaccurate samples", () => {
  expect(evaluateTurf(turf, samples, "simulation", "Løping", 45).eligible).toBe(
    false,
  );
  expect(evaluateTurf(turf, samples, "gps", "Sykling", 45).eligible).toBe(
    false,
  );
  expect(
    evaluateTurf(turf, [...samples].reverse(), "gps", "Løping", 45).eligible,
  ).toBe(false);
  expect(
    evaluateTurf(turf, samples.slice(0, 3), "gps", "Løping", 45).eligible,
  ).toBe(false);
  expect(
    evaluateTurf(
      turf,
      samples.map((p) => ({ ...p, accuracy: 50 })),
      "gps",
      "Løping",
      45,
    ).eligible,
  ).toBe(false);
});
test("rejects GPS gaps and impossible speed instead of awarding turf", () => {
  expect(
    evaluateTurf(
      turf,
      samples.map((p, i) => ({ ...p, timestamp: 1000 + i * 30000 })),
      "gps",
      "Løping",
      45,
    ).eligible,
  ).toBe(false);
  expect(
    evaluateTurf(
      turf,
      samples.map((p, i) => ({ ...p, timestamp: 1000 + i * 1000 })),
      "gps",
      "Løping",
      45,
    ).eligible,
  ).toBe(false);
});
