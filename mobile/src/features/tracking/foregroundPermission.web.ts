import { permissionWaitMessage } from "./locationDeadline";

// Expo's web permission request waits for a GPS fix with no timeout. Observe
// permission itself so granting access can start the timer before GPS is ready.
export function requestForegroundPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let status: PermissionStatus | undefined;
    const finish = (granted?: boolean, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      status?.removeEventListener("change", changed);
      if (error) reject(error);
      else resolve({ granted: !!granted, canAskAgain: !!granted });
    };
    const changed = () => {
      if (status?.state === "granted") finish(true);
      else if (status?.state === "denied") finish(false);
    };
    const timer = setTimeout(
      () => finish(undefined, new Error(permissionWaitMessage)),
      15_000,
    );
    const ask = () => {
      if (settled) return;
      if (!navigator.geolocation) {
        finish(
          undefined,
          new Error("Posisjon støttes ikke i denne nettleseren."),
        );
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => finish(true),
        (error) => {
          if (error.code === 1) finish(false);
          else if (status?.state === "granted") finish(true);
          else finish(undefined, new Error(permissionWaitMessage));
        },
        { timeout: 12_000, maximumAge: 60_000, enableHighAccuracy: false },
      );
    };
    if (!navigator.permissions?.query) {
      ask();
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (settled) return;
        status = result;
        status.addEventListener("change", changed);
        changed();
        ask();
      })
      .catch(ask);
  });
}
