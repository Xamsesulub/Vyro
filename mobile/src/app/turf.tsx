import { useLocalSearchParams } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { useAuthStore } from "../stores/useAuthStore";
import { TurfBrowser } from "../features/turf/TurfBrowser";
import { TurfComposer } from "../features/turf/TurfComposer";
import { TurfDetail } from "../features/turf/TurfDetail";

export default function TurfScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { turfId, workoutId, mode } = useLocalSearchParams<{
    turfId?: string;
    workoutId?: string;
    mode?: string;
  }>();
  return (
    <AccountGate>
      {userId &&
        (mode === "new" || mode === "attempt" || workoutId ? (
          <TurfComposer
            key={`${userId}:${mode ?? ""}:${turfId ?? "new"}:${workoutId ?? "choose"}`}
            userId={userId}
            turfId={mode === "new" ? undefined : turfId}
            workoutId={workoutId}
          />
        ) : turfId ? (
          <TurfDetail key={`${userId}:${turfId}`} userId={userId} id={turfId} />
        ) : (
          <TurfBrowser key={userId} userId={userId} />
        ))}
    </AccountGate>
  );
}
