import { AppState } from "react-native";
import { appPersistence, useAppStore } from "../../stores/useAppStore";
import { useTrackingStatus } from "../../stores/useTrackingStatus";
import { backgroundSupported, verifyBackgroundRecording } from "./background";

export function observeRecording() {
  const tick = () => {
    if (useAppStore.getState().recording.status === "recording")
      useAppStore.getState().tick();
  };
  const timer = setInterval(() => {
    if (AppState.currentState === "active") tick();
  }, 1000);
  const subscription = AppState.addEventListener("change", (status) => {
    // Include the last fraction of a second before suspension; on return,
    // wall-clock elapsed time catches up even when JS timers were suspended.
    tick();
    if (status === "active") {
      void verifyBackgroundRecording();
      return;
    }
    const recording = useAppStore.getState().recording;
    // Native registration can still be resolving when the user locks the
    // screen. Start owns this bounded operation and pauses on failure; do not
    // cancel a successfully starting background service in the meantime.
    const backgroundStarting =
      useTrackingStatus.getState().starting &&
      recording.mode === "gps" &&
      useAppStore.getState().backgroundRecording &&
      backgroundSupported;
    if (
      recording.status === "recording" &&
      !useTrackingStatus.getState().backgroundActive &&
      !backgroundStarting
    ) {
      useAppStore.getState().event("pause");
      if (recording.mode === "gps")
        useTrackingStatus.setState({
          error: backgroundSupported
            ? "Økten er pauset. Slå på «Fortsett med låst skjerm» før neste økt for å bruke andre apper under opptaket."
            : "Økten er pauset. Denne testversjonen må være åpen under opptaket. Bruk en egen installasjon av VYRO for opptak med låst skjerm.",
        });
    }
    void appPersistence.flush();
  });
  return () => {
    clearInterval(timer);
    subscription.remove();
  };
}
