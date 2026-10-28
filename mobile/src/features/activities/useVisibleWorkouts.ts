import { useMemo } from "react";
import { isRecordedWorkout } from "./model";
import { useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
export function useVisibleWorkouts() {
  const workouts = useAppStore((s) => s.workouts);
  const id = useAuthStore((s) => s.session?.user.id);
  return useMemo(
    () =>
      workouts.filter((w) => isRecordedWorkout(w) && !!id && w.ownerId === id),
    [workouts, id],
  );
}
