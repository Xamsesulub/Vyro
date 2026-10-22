import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { useAppStore } from "../../stores/useAppStore";
// One listener for foreground and background fixes. Paused/old splits never replay.
export function observeKilometerAlerts() {
  return useAppStore.subscribe((next, previous) => {
    const r = next.recording;
    if (r.status !== "recording" && previous.recording.status === "recording")
      void Speech.stop().catch(() => undefined);
    const last = r.splits?.at(-1);
    if (
      r.mode !== "gps" ||
      r.status !== "recording" ||
      !last ||
      (r.splits?.length ?? 0) <= (previous.recording.splits?.length ?? 0)
    )
      return;
    if (next.kilometerAlerts === "vibration")
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    if (next.kilometerAlerts === "voice") {
      void Speech.stop()
        .then(() => {
          if (
            useAppStore.getState().recording.status !== "recording" ||
            useAppStore.getState().recording.ownerId !== r.ownerId ||
            useAppStore.getState().kilometerAlerts !== "voice"
          )
            return;
          const seconds = Math.round(last.seconds);
          Speech.speak(
            `${last.kilometer} kilometer. Siste kilometer: ${Math.floor(seconds / 60)} minutter og ${seconds % 60} sekunder.`,
            { language: "nb-NO", onError: () => {} },
          );
        })
        .catch(() => undefined);
    }
  });
}
