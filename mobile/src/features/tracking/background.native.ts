import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { appPersistence, useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useLocationStore } from "../../stores/useLocationStore";
import { useTrackingStatus } from "../../stores/useTrackingStatus";

let lastCheckpoint = 0;
const TASK = "vyro-private-workout-v1";
export const backgroundSupported = true;
let operations: Promise<unknown> = Promise.resolve();
const serial = <T>(action: () => Promise<T>) => {
  const next = operations.then(action);
  operations = next.catch(() => undefined);
  return next;
};
const ownsRecording = () => {
  const s = useAppStore.getState();
  return (
    s.ready &&
    s.recording.mode === "gps" &&
    s.recording.status === "recording" &&
    !!s.recording.ownerId &&
    s.recording.ownerId === useAuthStore.getState().session?.user.id
  );
};
export async function requestBackgroundAccess() {
  if (!(await TaskManager.isAvailableAsync()))
    throw new Error(
      "Bakgrunnsopptak krever et nytt mobilbygg på denne enheten.",
    );
  const result = await Location.requestBackgroundPermissionsAsync();
  if (!result.granted)
    throw new Error(
      "Tillat posisjon også i bakgrunnen i telefonens innstillinger, eller slå av bakgrunnsopptak.",
    );
}
export function startBackground() {
  return serial(async () => {
    if (!ownsRecording()) return;
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 2,
      deferredUpdatesInterval: 1000,
      deferredUpdatesDistance: 0,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "VYRO registrerer økten",
        notificationBody:
          "GPS-opptak pågår. Åpne VYRO for å pause eller avslutte.",
        notificationColor: "#11182C",
        killServiceOnDestroy: true,
      },
    });
    if (!ownsRecording()) {
      await Location.stopLocationUpdatesAsync(TASK);
      return;
    }
    useTrackingStatus.setState({ backgroundActive: true });
  });
}
export function stopBackground() {
  useTrackingStatus.setState({ backgroundActive: false });
  return serial(async () => {
    if (await Location.hasStartedLocationUpdatesAsync(TASK))
      await Location.stopLocationUpdatesAsync(TASK);
  });
}
if (!TaskManager.isTaskDefined(TASK))
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    TASK,
    async ({ data, error }) => {
      // A cold/restarted runtime has no active authenticated recording. It must not
      // resume collection from an old draft or request credentials in the background.
      if (error || !ownsRecording()) {
        if (error) {
          useAppStore.getState().event("pause");
          useTrackingStatus.setState({
            error: "GPS-opptaket ble avbrutt. Åpne appen for å fortsette.",
          });
        }
        await stopBackground();
        return;
      }
      for (const { coords, timestamp } of [...(data?.locations ?? [])].sort(
        (a, b) => a.timestamp - b.timestamp,
      )) {
        if (!ownsRecording() || timestamp > Date.now() + 5000) break;
        const fix = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp,
        };
        useAppStore.getState().gpsFix(fix);
        useLocationStore.getState().setPosition(fix);
      }
      useAppStore.getState().tick();
      if (Date.now() - lastCheckpoint >= 5000) {
        lastCheckpoint = Date.now();
        await appPersistence.flush();
      }
    },
  );
useAppStore.subscribe((state, previous) => {
  if (
    previous.recording.status === "recording" &&
    state.recording.status !== "recording"
  )
    void stopBackground().catch(() =>
      useTrackingStatus.setState({
        error:
          "Kunne ikke stoppe GPS-tjenesten. Slå av posisjon i telefoninnstillingene.",
      }),
    );
});
useAuthStore.subscribe((state, previous) => {
  if (state.session?.user.id !== previous.session?.user.id) {
    useAppStore.getState().event("pause");
    void stopBackground().catch(() => undefined);
  }
});
