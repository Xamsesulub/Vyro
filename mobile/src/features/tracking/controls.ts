import { useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useTrackingStatus } from "../../stores/useTrackingStatus";
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
  try {
    const background =
      before.mode === "gps" &&
      useAppStore.getState().backgroundRecording &&
      backgroundSupported;
    if (background) await requestBackgroundAccess();
    if (
      useAuthStore.getState().session?.user.id !== owner ||
      useAppStore.getState().recording !== before
    )
      return;
    useAppStore.getState().event(event);
    if (background) await startBackground();
  } catch (error) {
    useAppStore.getState().event("pause");
    await stopBackground().catch(() => undefined);
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
