import type { Camera } from "react-native-maps";

/** RN Maps' imperative MapKit bridge exposes height above ground, while visual
 * zoom depends on distance to the map centre. Keep that distance when tilting. */
export function cameraAtPitch(camera: Camera, pitch: number): Camera {
  if (!Number.isFinite(camera.altitude) || !Number.isFinite(camera.pitch))
    return { ...camera, pitch };
  const oldCos = Math.cos(
    (Math.min(85, Math.max(0, camera.pitch)) * Math.PI) / 180,
  );
  const newCos = Math.cos((Math.min(85, Math.max(0, pitch)) * Math.PI) / 180);
  return { ...camera, pitch, altitude: (camera.altitude! * newCos) / oldCos };
}
