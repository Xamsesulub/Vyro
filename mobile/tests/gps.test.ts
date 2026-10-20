import {
  distanceMeters,
  segmentDistance,
  validFix,
  Fix,
} from "../src/features/tracking/gps";
const a: Fix = {
  latitude: 59.9,
  longitude: 10.7,
  timestamp: 100000,
  accuracy: 5,
};
test("rejects stale, imprecise and invalid GPS fixes", () => {
  expect(validFix(a, 100000)).toBe(true);
  expect(validFix({ ...a, accuracy: 50 }, 100000)).toBe(false);
  expect(validFix({ ...a, latitude: NaN }, 100000)).toBe(false);
  expect(validFix({ ...a, longitude: 190 }, 100000)).toBe(false);
  expect(validFix(a, 200000)).toBe(false);
});
test("measures meters and rejects gaps, reversal in timestamps and jumps", () => {
  const b = { ...a, latitude: 59.9001, timestamp: 105000 };
  expect(distanceMeters(a, b)).toBeCloseTo(11.119, 2);
  expect(segmentDistance(a, b)).toBeCloseTo(11.119, 2);
  expect(segmentDistance(a, { ...b, timestamp: 99000 })).toBeNull();
  expect(segmentDistance(a, { ...b, timestamp: 140000 })).toBeNull();
  expect(segmentDistance(a, { ...b, latitude: 60 })).toBeNull();
  expect(segmentDistance(a, { ...a, timestamp: 105000 })).toBe(0);
});
