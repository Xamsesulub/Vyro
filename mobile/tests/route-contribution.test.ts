import { contributionPreview } from "../src/features/routes/contribution";
import { sharedRoute } from "../src/features/social/routePrivacy";
import { metersBetween } from "../src/features/tracking/gps";
import { contributionWorkout as w } from "./contribution-fixture";
test("contribution preview hides both endpoints and only preserves visible geometry", () => {
  const p = contributionPreview(w, "owner")!;
  expect(p.route).toEqual(sharedRoute(w.route, 500));
  for (const point of p.route) {
    expect(metersBetween(point, w.route![0])).toBeGreaterThan(500);
    expect(metersBetween(point, w.route!.at(-1)!)).toBeGreaterThan(500);
    expect(
      Object.keys(point).every((k) =>
        ["latitude", "longitude", "breakBefore"].includes(k),
      ),
    ).toBe(true);
  }
  expect(p.distance).toBeLessThan(w.distance * 1000);
  expect(w.route).toHaveLength(101);
  expect(w.visibility).toBe("private");
});
test.each(["simulation", "example"] as const)(
  "rejects %s and other people's workouts",
  (source) => {
    expect(contributionPreview({ ...w, source }, "owner")).toBeNull();
    expect(contributionPreview(w, "other")).toBeNull();
    expect(
      contributionPreview({ ...w, ownerId: undefined }, "owner"),
    ).toBeNull();
  },
);
test("short, disconnected and invalid routes cannot be shared", () => {
  expect(
    contributionPreview({ ...w, route: w.route!.slice(0, 10) }, "owner"),
  ).toBeNull();
  expect(
    contributionPreview(
      { ...w, route: w.route!.map((p) => ({ ...p, breakBefore: true })) },
      "owner",
    ),
  ).toBeNull();
  expect(contributionPreview({ ...w, route: [] }, "owner")).toBeNull();
});
