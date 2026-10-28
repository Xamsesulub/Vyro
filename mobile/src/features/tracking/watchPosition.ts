import * as Location from "expo-location";
import type { GpsFix } from "./gps";

export async function watchPosition(
  onPosition: (fix: GpsFix) => void,
  onError: () => void,
) {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 2,
      timeInterval: 1000,
    },
    ({ coords, timestamp }) =>
      onPosition({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed,
        timestamp,
      }),
    onError,
  );
}
