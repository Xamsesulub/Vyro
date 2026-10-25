import { AppState } from "react-native";
import { create } from "zustand";
import { appPersistence, useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { importWatchWorkouts } from "./controller";
import { watchNative, type WatchConnection } from "./native";

export const watchSupported = !!watchNative;
export const useWatchStatus = create<
  WatchConnection & { busy: boolean; error: string | null; imported: number }
>(() => ({
  paired: false,
  installed: false,
  reachable: false,
  busy: false,
  error: null,
  imported: 0,
}));
function owner() {
  const app = useAppStore.getState(),
    auth = useAuthStore.getState();
  const id = auth.session?.user.id;
  return app.ready && auth.ready && id && app.watchOwners.includes(id)
    ? id
    : undefined;
}
let running: Promise<void> | undefined;
let requested = false;
export function syncWatch(): Promise<void> {
  if (
    !watchNative ||
    !useAppStore.getState().ready ||
    !useAuthStore.getState().ready
  )
    return Promise.resolve();
  requested = true;
  if (running) return running;
  const native = watchNative;
  running = (async () => {
    useWatchStatus.setState({ busy: true });
    while (requested) {
      requested = false;
      try {
        const imported = await importWatchWorkouts({
          owner,
          setOwner: (id) => native.setOwner(id),
          pending: (id) => native.pending(id),
          received: (receipt) =>
            useAppStore.getState().watchReceipts.includes(receipt),
          save: (workout, receipt) =>
            useAppStore.setState((s) => ({
              workouts: s.workouts.some(
                (w) => w.id === workout.id && w.ownerId === workout.ownerId,
              )
                ? s.workouts
                : [workout, ...s.workouts],
              watchReceipts: [...s.watchReceipts, receipt],
            })),
          persist: async () => {
            await appPersistence.retry();
            if (useAppStore.getState().storageError)
              throw new Error(
                "Kunne ikke lagre klokkeøkten på iPhone. Kopien på klokken er beholdt.",
              );
          },
          acknowledge: (id, user) => native.acknowledge(id, user),
        });
        useWatchStatus.setState({
          ...(await native.status()),
          imported,
          error: null,
        });
      } catch (e) {
        useWatchStatus.setState({
          error:
            e instanceof Error
              ? e.message
              : "Kunne ikke synkronisere klokken. Prøv igjen.",
        });
      }
    }
  })().finally(() => {
    running = undefined;
    useWatchStatus.setState({ busy: false });
    if (requested) void syncWatch();
  });
  return running;
}
export function observeWatch() {
  if (!watchNative) return;
  const refresh = () => {
    void syncWatch();
  };
  const app = useAppStore.subscribe((s, previous) => {
    if (s.ready !== previous.ready || s.watchOwners !== previous.watchOwners)
      refresh();
  });
  const auth = useAuthStore.subscribe(refresh);
  const events = watchNative.addListener("change", refresh);
  const foreground = AppState.addEventListener("change", (state) => {
    if (state === "active") refresh();
  });
  refresh();
  return () => {
    app();
    auth();
    events.remove();
    foreground.remove();
  };
}
