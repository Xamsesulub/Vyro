import { usePathname } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";

function Awake() {
  useKeepAwake("vyro-workout", { suppressDeactivateWarnings: true });
  return null;
}

export function WorkoutAwake() {
  const path = usePathname();
  const enabled = useAppStore((s) => s.keepWorkoutAwake);
  const status = useAppStore((s) => s.recording.status);
  const owner = useAppStore((s) => s.recording.ownerId);
  const user = useAuthStore((s) => s.session?.user.id);
  return enabled &&
    (!owner || owner === user) &&
    (path === "/track" || path === "/map") &&
    (status === "recording" || status === "paused") ? (
    <Awake />
  ) : null;
}
