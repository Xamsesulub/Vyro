import * as Location from "expo-location";
import { watchPosition } from "../src/features/tracking/watchPosition";
import { addFix, type GpsFix } from "../src/features/tracking/gps";
import {
  initialRecording,
  transition,
} from "../src/features/tracking/simulator";

jest.mock("expo-location", () => ({
  Accuracy: { BestForNavigation: 6 },
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

test("foreground GPS passes native speed to the distance filter", async () => {
  let r = transition(initialRecording, "start", 0);
  await watchPosition((fix: GpsFix) => {
    r = addFix(r, fix);
  }, jest.fn());
  const deliver = jest.mocked(Location.watchPositionAsync).mock.calls[0][1];
  for (let i = 0; i <= 60; i++) {
    deliver({
      coords: {
        latitude: 59.9 + i * 0.0002,
        longitude: 10.75,
        accuracy: 5,
        speed: 22.2,
      },
      timestamp: i * 1000,
    } as Location.LocationObject);
  }
  expect(r.route[0]).toHaveLength(61);
  expect(r.distance).toBeCloseTo(1.334, 2);
});
