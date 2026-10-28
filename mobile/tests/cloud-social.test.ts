jest.mock("../src/lib/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));
import { supabase } from "../src/lib/supabase";
import { publish } from "../src/features/social/api";
import { Workout } from "../src/features/activities/model";
import { sharedRoute, WORKOUT_SHARING_RADIUS_METERS } from "../src/features/social/routePrivacy";
import { metersBetween } from "../src/features/tracking/gps";
const rpc = supabase!.rpc as jest.Mock;
const workout: Workout = {
  id: "gps-test",
  ownerId: "alice",
  source: "gps",
  title: "Løpetur",
  sport: "Løping",
  date: "2026-10-20T10:00:00Z",
  distance: 2,
  seconds: 600,
  notes: "private notes",
  visibility: "private",
  route: [
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.91, longitude: 10.71 },
    { latitude: 59.92, longitude: 10.72 },
    { latitude: 59.93, longitude: 10.73 },
  ],
};
beforeEach(() => rpc.mockReset());
test("refuses another account's local workout and simulated records", async () => {
  await expect(publish(workout, "bob")).rejects.toThrow();
  await expect(
    publish({ ...workout, source: "simulation" }, "alice"),
  ).rejects.toThrow();
  await expect(
    publish({ ...workout, ownerId: undefined }, "alice"),
  ).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
});
test("publishes only explicit workout fields, never private notes or an owner override", async () => {
  rpc.mockResolvedValue({ data: "post-id", error: null });
  await expect(publish(workout, "alice")).resolves.toBe("post-id");
  expect(rpc.mock.calls[0][0]).toBe("publish_workout");
  const payload = rpc.mock.calls[0][1];
  expect(payload.p_route).toEqual(sharedRoute(workout.route, WORKOUT_SHARING_RADIUS_METERS));
  expect(payload.p_distance_km).toBe(2);
  expect(JSON.stringify(payload)).not.toContain("private notes");
  expect(payload).not.toHaveProperty("owner_id");
});
test("does not report successful publication when the server rejects it", async () => {
  rpc.mockResolvedValue({ data: null, error: new Error("denied") });
  await expect(publish(workout, "alice")).rejects.toThrow("denied");
});

test("shares a 650 m workout with 200 m endpoint shielding and complete totals", async () => {
  const route = Array.from({ length: 27 }, (_, index) => ({
    latitude: 60 + (index * 25) / 111195,
    longitude: 10,
  }));
  const original = JSON.stringify(route);
  rpc.mockResolvedValue({ data: "short-post", error: null });
  await expect(publish({ ...workout, distance: 0.65, seconds: 439, route }, "alice")).resolves.toBe("short-post");
  const payload = rpc.mock.calls[0][1];
  expect(payload.p_route.length).toBeGreaterThan(1);
  for (const point of payload.p_route) {
    expect(metersBetween(route[0], point)).toBeGreaterThan(200);
    expect(metersBetween(route[26], point)).toBeGreaterThan(200);
  }
  expect(payload.p_route.some((point: (typeof route)[number]) => metersBetween(route[0], point) < 500)).toBe(true);
  expect(payload.p_distance_km).toBe(0.65);
  expect(payload.p_seconds).toBe(439);
  expect(JSON.stringify(route)).toBe(original);
});
test("football publishes sanitized full pitch only after explicit consent, with optional GPS speed", async () => {
  const ball: Workout = {
    ...workout,
    sport: "Fotball",
    maxSpeedKmh: 21.6,
    route: [
      { latitude: 59.9, longitude: 10.7 },
      { latitude: 59.9005, longitude: 10.7005 },
    ],
  };
  rpc.mockResolvedValue({ data: "post-id", error: null });
  await expect(publish(ball, "alice")).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
  await expect(publish(ball, "alice", "followers", true)).resolves.toBe(
    "post-id",
  );
  expect(rpc).toHaveBeenCalledWith(
    "publish_football_workout",
    expect.objectContaining({
      p_route: ball.route,
      p_max_speed_kmh: 21.6,
      p_audience: "followers",
    }),
  );
  expect(JSON.stringify(rpc.mock.calls[0][1])).not.toContain("private notes");
  await expect(publish(ball, "bob", "everyone", true)).rejects.toThrow();
});
