import {
  sharedRoute,
  hasVisibleSegment,
} from "../src/features/social/routePrivacy";
const p = (latitude: number) => ({ latitude, longitude: 10 });
test("hides endpoints and later visits without joining across hidden areas", () => {
  const original = [
    p(60),
    p(60.01),
    p(60.02),
    p(60),
    p(60.02),
    p(60.03),
    p(60.04),
  ];
  const visible = sharedRoute(original);
  expect(visible).toEqual([
    { ...p(60.01), breakBefore: true },
    p(60.02),
    { ...p(60.02), breakBefore: true },
    p(60.03),
  ]);
  expect(original).toHaveLength(7);
  expect(hasVisibleSegment(visible)).toBe(true);
});
test("short routes and isolated points cannot be published", () => {
  expect(hasVisibleSegment(sharedRoute([p(60), p(60.001)]))).toBe(false);
  expect(hasVisibleSegment(sharedRoute([p(60), p(60.01), p(60.02)]))).toBe(
    false,
  );
});
test("does not draw a line through the hidden start between sparse fixes", () => {
  const result = sharedRoute([p(60), p(60.01), p(59.99), p(59.98), p(59.97)]);
  expect(result[1].breakBefore).toBe(true);
});
