import { useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useTrackingStatus } from "../../stores/useTrackingStatus";
import { useLocationStore } from "../../stores/useLocationStore";
import { locationDeadline } from "./locationDeadline";
import { waitForRecordingForeground } from "./recordingForeground";
import {
  backgroundSupported,
  requestBackgroundAccess,
  startBackground,
  stopBackground,
} from "./background";

export async function beginRecording(event: "start" | "resume") {
  if (useTrackingStatus.getState().starting) return;
  const before = useAppStore.getState().recording;
  const owner = useAuthStore.getState().session?.user.id;
  if (
    before.status !== (event === "start" ? "idle" : "paused") ||
    (before.mode === "gps" &&
      (!owner || (before.ownerId && before.ownerId !== owner)))
  )
    return;
  useTrackingStatus.setState({ starting: true, error: null });
  let started = false;
  try {
    if (
      before.mode === "gps" &&
      !(await useLocationStore.getState().request())
    ) {
      useTrackingStatus.setState({
        error:
          useLocationStore.getState().error ??
          "Tillat posisjon for å starte GPS-opptak.",
      });
      return;
    }
    const background =
      before.mode === "gps" &&
      useAppStore.getState().backgroundRecording &&
      backgroundSupported;
    if (background) await locationDeadline(requestBackgroundAccess());
    if (before.mode === "gps") await waitForRecordingForeground();
    if (
      useAuthStore.getState().session?.user.id !== owner ||
      useAppStore.getState().recording !== before
    )
      return;
    useAppStore.getState().event(event);
    started = true;
    if (background) await locationDeadline(startBackground());
  } catch (error) {
    if (started) {
      useAppStore.getState().event("pause");
      void stopBackground().catch(() => undefined);
    }
    useTrackingStatus.setState({
      error:
        error instanceof Error
          ? error.message
          : "Kunne ikke starte opptaket. Prøv igjen.",
    });
  } finally {
    useTrackingStatus.setState({ starting: false });
  }
}
