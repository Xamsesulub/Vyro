import type { GpsFix } from "./gps";

// Expo's web watcher passes native options to the browser and drops errors.
// Use the browser's high-accuracy option and retain cancellation/error handling.
export async function watchPosition(
  onPosition: (fix: GpsFix) => void,
  onError: () => void,
) {
  let active = true;
  const id = navigator.geolocation.watchPosition(
    ({ coords, timestamp }) => {
      if (active)
        onPosition({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp,
        });
    },
    () => {
      if (active) onError();
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
  );
  return {
    remove() {
      active = false;
      navigator.geolocation.clearWatch(id);
    },
  };
}
