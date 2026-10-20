import { useEffect } from "react";
import * as Location from "expo-location";
import { useAppStore } from "../stores/useAppStore";
import { useLocationStore } from "../stores/useLocationStore";

// One foreground watcher for the whole app. It runs while a GPS session records
// or a screen shows the live map, and stops otherwise to save battery.
export function LocationWatcher() {
  const granted = useLocationStore((s) => s.permission === "granted");
  const viewing = useLocationStore((s) => s.viewers > 0);
  const recording = useAppStore(
    (s) => s.recording.mode === "gps" && s.recording.status === "recording",
  );
  const active = granted && (viewing || recording);
  useEffect(() => {
    if (!active) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 2,
        timeInterval: 1000,
      },
      ({ coords, timestamp }) => {
        const fix = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp,
        };
        useLocationStore.getState().setPosition(fix);
        useAppStore.getState().gpsFix(fix);
      },
      () => useLocationStore.getState().setError("Fant ikke GPS-signal."),
    )
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch(() =>
        useLocationStore
          .getState()
          .setError("Kunne ikke starte posisjon. Er stedstjenester på?"),
      );
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [active]);
  return null;
}
