import { cameraAtPitch } from "../src/features/maps/appleCameraPitch";
import type { Camera } from "react-native-maps";

test("tilting a camera 55 degrees keeps its 1000m viewing distance, not its vertical height", () => {
  const start = {
    center: { latitude: 59.9, longitude: 10.7 },
    altitude: 1000,
    heading: 72,
    pitch: 0,
  };
  let camera: Camera = start;
  for (let i = 0; i < 20; i++) {
    camera = cameraAtPitch(camera, 55);
    expect(camera.altitude).toBeCloseTo(573.576436, 5);
    camera = cameraAtPitch(camera, 0);
    expect(camera.altitude).toBeCloseTo(1000, 5);
  }
  expect(camera.center).toEqual(start.center);
  expect(camera.heading).toBe(72);
});

test("a manually selected 30-degree angle converts back to the same eye distance", () => {
  const camera = cameraAtPitch(
    {
      center: { latitude: 59.9, longitude: 10.7 },
      altitude: 866.0254038,
      heading: 0,
      pitch: 30,
    },
    0,
  );
  expect(camera.altitude).toBeCloseTo(1000, 5);
});
