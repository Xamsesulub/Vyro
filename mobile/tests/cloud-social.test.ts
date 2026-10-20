jest.mock("../src/lib/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));
import { supabase } from "../src/lib/supabase";
import { publish } from "../src/features/social/api";
import { Workout } from "../src/features/activities/model";
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
  expect(payload.p_route).toEqual(workout.route);
  expect(payload.p_distance_km).toBe(2);
  expect(JSON.stringify(payload)).not.toContain("private notes");
  expect(payload).not.toHaveProperty("owner_id");
});
test("does not report successful publication when the server rejects it", async () => {
  rpc.mockResolvedValue({ data: null, error: new Error("denied") });
  await expect(publish(workout, "alice")).rejects.toThrow("denied");
});
