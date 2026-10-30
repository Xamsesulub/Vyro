import { Redirect, useLocalSearchParams } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { useAuthStore } from "../stores/useAuthStore";
import { TurfComposer } from "../features/turf/TurfComposer";
import { TurfDetail } from "../features/turf/TurfDetail";

export default function TurfScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { turfId, workoutId, mode, clubId } = useLocalSearchParams<{
    turfId?: string;
    workoutId?: string;
    mode?: string;
    clubId?: string;
  }>();
  return (
    <AccountGate>
      {userId &&
        (mode === "new" || mode === "attempt" || workoutId ? (
          <TurfComposer
            key={`${userId}:${clubId ?? ""}:${mode ?? ""}:${turfId ?? "new"}:${workoutId ?? "choose"}`}
            userId={userId}
            turfId={mode === "new" ? undefined : turfId}
            workoutId={workoutId}
            clubId={clubId}
          />
        ) : turfId ? (
          <TurfDetail key={`${userId}:${turfId}`} userId={userId} id={turfId} />
        ) : (
          <Redirect
            href={{
              pathname: "/(tabs)/map",
              params: { view: "zones", clubId },
            }}
          />
        ))}
    </AccountGate>
  );
}
