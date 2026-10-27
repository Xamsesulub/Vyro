import type { Camera } from "react-native-maps";

type CameraView = {
  getCamera(): Promise<Camera>;
  setCamera(camera: Partial<Camera>): void;
};

function matches(actual: Camera, desired: Partial<Camera>) {
  const headingGap =
    desired.heading === undefined
      ? 0
      : Math.abs(((actual.heading - desired.heading + 540) % 360) - 180);
  return (
    (desired.pitch === undefined ||
      Math.abs(actual.pitch - desired.pitch) < 1) &&
    headingGap < 1 &&
    (desired.altitude === undefined ||
      (actual.altitude !== undefined &&
        Math.abs(actual.altitude - desired.altitude) <
          Math.max(3, desired.altitude * 0.01))) &&
    (!desired.center ||
      (Math.abs(actual.center.latitude - desired.center.latitude) < 0.00001 &&
        Math.abs(actual.center.longitude - desired.center.longitude) < 0.00001))
  );
}

/** A React commit is not an acknowledgement from MapKit. A mode change can
 * reset the camera after setCamera, so reconcile native feedback briefly.
 * This never fits a route, and cannot keep fighting the user's gestures. */
export function beginAppleCameraTransition(
  view: CameraView,
  camera: Partial<Camera>,
  isCurrent: () => boolean,
) {
  let cancelled = false;
  let reading = false;
  let reads = 0;
  let lastRead = -Infinity;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const cancel = () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
  const active = () => !cancelled && isCurrent();
  const check = async () => {
    if (!active() || reading || reads >= 32 || Date.now() - lastRead < 80)
      return;
    reading = true;
    lastRead = Date.now();
    reads++;
    try {
      const actual = await view.getCamera();
      if (active() && !matches(actual, camera)) view.setCamera(camera);
    } catch {
      // A later native callback / bounded check can retry a failed read.
    } finally {
      reading = false;
    }
  };
  if (active()) view.setCamera(camera);
  // Native region events normally acknowledge the change. These checks also
  // cover a mode reset that emits no event; they stop after 2.5 seconds.
  for (const delay of [60, 180, 400, 900, 1800])
    timers.push(
      setTimeout(() => {
        void check();
      }, delay),
    );
  timers.push(setTimeout(cancel, 2500));
  return { check, cancel };
}
