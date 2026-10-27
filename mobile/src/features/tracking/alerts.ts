import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { useAppStore } from "../../stores/useAppStore";
import { useTrackingStatus } from "../../stores/useTrackingStatus";

type AlertMode = "off" | "voice" | "vibration";
export const stopWorkoutSpeech = () => Speech.stop().catch(() => undefined);

// Preview requests never create a split or workout.
export async function playWorkoutAlert(
  mode: AlertMode,
  text = "Dette er et prøvevarsel fra VYRO. Én kilometer er fullført.",
  current = () => true,
) {
  if (mode === "off" || !current()) return;
  if (mode === "vibration") {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  await Speech.stop();
  if (!current()) return;
  Speech.speak(text, {
    language: "nb-NO",
    onError: () => {
      if (current())
        useTrackingStatus.setState({
          alertError:
            "Talevarselet kunne ikke spilles av. Prøv igjen med lyd på.",
        });
    },
  });
}
// One listener for foreground and background fixes. Paused/old splits never replay.
export function observeKilometerAlerts() {
  let active = true;
  const unsubscribe = useAppStore.subscribe((next, previous) => {
    const r = next.recording;
    if (
      (r.status !== "recording" && previous.recording.status === "recording") ||
      (previous.kilometerAlerts === "voice" && next.kilometerAlerts !== "voice")
    )
      void stopWorkoutSpeech();
    const last = r.splits?.at(-1);
    if (
      r.mode !== "gps" ||
      r.status !== "recording" ||
      !last ||
      (r.splits?.length ?? 0) <= (previous.recording.splits?.length ?? 0)
    )
      return;
    const current = () => {
      const s = useAppStore.getState();
      return (
        active &&
        s.recording.status === "recording" &&
        s.recording.ownerId === r.ownerId &&
        s.recording.splits?.at(-1) === last &&
        s.kilometerAlerts === next.kilometerAlerts
      );
    };
    const seconds = Math.round(last.seconds);
    void playWorkoutAlert(
      next.kilometerAlerts,
      `${last.kilometer} kilometer. Siste kilometer: ${Math.floor(seconds / 60)} minutter og ${seconds % 60} sekunder.`,
      current,
    ).catch(() => {
      if (current())
        useTrackingStatus.setState({
          alertError: "Kilometervarselet kunne ikke spilles av.",
        });
    });
  });
  return () => {
    active = false;
    unsubscribe();
    void stopWorkoutSpeech();
  };
}
