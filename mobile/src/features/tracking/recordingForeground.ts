import { AppState, Platform } from "react-native";
import { locationDeadline } from "./locationDeadline";

// Permission dialogs temporarily make iOS inactive. Start the user-initiated
// background service (and Live Activity) only after the app becomes active.
export async function waitForRecordingForeground() {
  if (Platform.OS === "web" || AppState.currentState === "active") return;
  let subscription: ReturnType<typeof AppState.addEventListener> | undefined;
  try {
    await locationDeadline(
      new Promise<void>((resolve) => {
        subscription = AppState.addEventListener("change", (state) => {
          if (state === "active") resolve();
        });
        if (AppState.currentState === "active") resolve();
      }),
    );
  } catch {
    throw new Error("Hold VYRO åpen mens opptaket starter, og prøv igjen.");
  } finally {
    subscription?.remove();
  }
}
