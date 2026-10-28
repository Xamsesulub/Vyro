import {
  canPresentWorkout,
  snapshotRoute,
  workoutActivityProps,
  type WorkoutActivityProps,
  type WorkoutPresentation,
} from "./liveActivityModel";
import type { Coord } from "./gps";

export interface WorkoutActivity {
  getId(): string;
  update(props: WorkoutActivityProps, staleDate: Date): Promise<void>;
  end(policy: "immediate"): Promise<void>;
}
export interface WorkoutActivityPort {
  instances(): WorkoutActivity[];
  start(props: WorkoutActivityProps, staleDate: Date): WorkoutActivity;
  renderMap(route: Coord[][]): Promise<string | null>;
  clearMaps(): Promise<void>;
  error(message: string | null): void;
}

// Serialize ActivityKit changes, but never make Pause/End wait for map tiles.
// Requests coalesce: GPS/timer events cannot build up an update queue.
export function createWorkoutActivityController(
  read: () => WorkoutPresentation,
  port: WorkoutActivityPort,
  now = Date.now,
) {
  let activity: WorkoutActivity | undefined;
  let activityEpoch = -1;
  let owner: string | undefined;
  let epoch = 0;
  let blocked = false;
  let allowPausedStart = false;
  let disposed = false;
  let initialized = false;
  let pending = false;
  let task: Promise<void> | undefined;
  let lastUpdate = -Infinity;
  let lastStatus = "";
  let mapAt = 0;
  let mapUri: string | null = null;
  let mapAttempt = -Infinity;
  let mapPending = false;
  let lastRoute: Coord[][] | undefined;

  async function clear() {
    for (const item of port.instances()) await item.end("immediate");
    activity = undefined;
    await port.clearMaps();
  }

  function request(restorePaused = false): Promise<void> {
    const s = read();
    const nextOwner = !disposed && canPresentWorkout(s) ? s.userId : undefined;
    if (nextOwner !== owner) {
      owner = nextOwner;
      epoch++;
      blocked = false;
      allowPausedStart = false;
      mapUri = null;
      mapAt = 0;
      mapAttempt = -Infinity;
      lastRoute = undefined;
      lastUpdate = -Infinity;
    }
    // An explicit off/on choice may restore a paused workout's display. A
    // restored draft at cold start still never creates an activity by itself.
    if (restorePaused && s.foreground && canPresentWorkout(s))
      allowPausedStart = true;
    pending = true;
    if (!task) {
      task = drain().finally(() => {
        task = undefined;
        if (pending) void request();
      });
    }
    return task;
  }

  async function drain() {
    while (pending) {
      pending = false;
      try {
        if (!initialized) {
          // A persisted workout is restored paused; never keep an old timer
          // running on the lock screen after a process restart.
          await clear();
          initialized = true;
        }
        if (activity && activityEpoch !== epoch) await clear();
        const s = read();
        if (disposed || !canPresentWorkout(s)) {
          if (activity || mapPending || mapUri) await clear();
          port.error(null);
          continue;
        }
        if (blocked) continue;
        const stamp = now();
        const updateEpoch = epoch;
        if (
          activity &&
          !port.instances().some((a) => a.getId() === activity?.getId())
        ) {
          // Respect dismissal from the lock screen; do not recreate it on tick.
          activity = undefined;
          blocked = true;
          await port.clearMaps();
          continue;
        }
        if (!activity) {
          if (
            !s.foreground ||
            (s.recording.status !== "recording" && !allowPausedStart)
          )
            continue;
          try {
            activity = port.start(
              workoutActivityProps(s.recording, stamp, null, 0),
              new Date(
                stamp + (s.recording.mode === "timer" ? 8 * 3600000 : 45000),
              ),
            );
            activityEpoch = epoch;
            allowPausedStart = false;
            port.error(null);
          } catch {
            blocked = true;
            port.error(
              "Kunne ikke vise økten på låseskjermen. Sjekk at Liveaktiviteter er tillatt for VYRO i iPhone-innstillingene.",
            );
            continue;
          }
        }
        if (stamp - lastUpdate >= 15000 || lastStatus !== s.recording.status) {
          await activity.update(
            workoutActivityProps(s.recording, stamp, mapUri, mapAt),
            new Date(
              stamp + (s.recording.mode === "timer" ? 8 * 3600000 : 45000),
            ),
          );
          lastUpdate = stamp;
          lastStatus = s.recording.status;
        }
        if (disposed || updateEpoch !== epoch || !canPresentWorkout(read()))
          continue;
        if (
          !mapPending &&
          s.recording.mode === "gps" &&
          s.recording.route !== lastRoute &&
          stamp - mapAttempt >= 30000
        ) {
          const route = snapshotRoute(s.recording.route);
          if (!route.length) continue;
          const generation = epoch;
          mapPending = true;
          mapAttempt = stamp;
          lastRoute = s.recording.route;
          void port
            .renderMap(route)
            .then((uri) => {
              if (
                !disposed &&
                !blocked &&
                generation === epoch &&
                canPresentWorkout(read()) &&
                uri
              ) {
                mapUri = uri;
                mapAt = stamp;
                lastUpdate = -Infinity;
              } else if (!uri && generation === epoch) {
                lastRoute = undefined; // Retry a failed tile load at the next interval.
              }
            })
            .catch(() => {
              lastRoute = undefined;
            })
            .finally(() => {
              mapPending = false;
              if (!disposed) void request();
            });
        }
      } catch {
        port.error(
          "Låseskjermvisningen kunne ikke oppdateres. Åpne Tren for gjeldende økt.",
        );
      }
    }
  }

  return {
    request,
    dispose: () => {
      disposed = true;
      return request();
    },
  };
}
