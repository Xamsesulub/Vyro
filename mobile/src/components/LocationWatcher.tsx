import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { watchPosition } from "../features/tracking/watchPosition";
import { useAppStore } from "../stores/useAppStore";
import { useLocationStore } from "../stores/useLocationStore";
import { useTrackingStatus } from "../stores/useTrackingStatus";
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
  const backgroundActive = useTrackingStatus((s) => s.backgroundActive);
  const active =
    !backgroundActive &&
    foreground &&
    granted &&
    (viewing || recording) &&
    (!ownerId || ownerId === userId);
  useEffect(() => {
    if (!active) return;
    let sub: { remove(): void } | null = null;
    let cancelled = false;
    watchPosition(
      (fix) => {
        if (cancelled || Math.abs(Date.now() - fix.timestamp) > 15000) return;
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
