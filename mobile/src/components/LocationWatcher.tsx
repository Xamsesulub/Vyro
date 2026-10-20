import { useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { useAppStore } from "../stores/useAppStore";
import { useLocationStore } from "../stores/useLocationStore";
import { useAuthStore } from "../stores/useAuthStore";

// One foreground watcher for the whole app. It runs while a GPS session records
// or a screen shows the live map, and stops otherwise to save battery.
export function LocationWatcher() {
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const userId = useAuthStore((s) => s.session?.user.id);
  const ownerId = useAppStore((s) => s.recording.ownerId);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) =>
      setForeground(s === "active"),
    );
    return () => sub.remove();
  }, []);
  const granted = useLocationStore((s) => s.permission === "granted");
  const viewing = useLocationStore((s) => s.viewers > 0);
  const recording = useAppStore(
    (s) => s.recording.mode === "gps" && s.recording.status === "recording",
  );
  const active =
    foreground &&
    granted &&
    (viewing || recording) &&
    (!ownerId || ownerId === userId);
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
        if (cancelled || Math.abs(Date.now() - timestamp) > 15000) return;
        const fix = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp,
        };
        useLocationStore.getState().setPosition(fix);
        useAppStore.getState().gpsFix(fix);
      },
      () => {
        if (cancelled) return;
        useLocationStore
          .getState()
          .setError("Fant ikke GPS-signal. Økten er pauset.");
        useAppStore.getState().event("pause");
      },
    )
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch(() => {
        if (cancelled) return;
        useLocationStore
          .getState()
          .setError("Kunne ikke starte posisjon. Er stedstjenester på?");
        useAppStore.getState().event("pause");
      });
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [active]);
  return null;
}
