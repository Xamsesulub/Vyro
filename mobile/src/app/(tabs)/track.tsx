import { useState } from "react";
import { router } from "expo-router";
import { Button, Screen, Txt } from "../../components/ui";
import RecordingMap from "../../components/RecordingMap";
import SportPicker from "../../components/SportPicker";
import { useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useLiveLocation } from "../../features/tracking/useLiveLocation";
import { beginRecording } from "../../features/tracking/controls";
import { useTrackingStatus } from "../../stores/useTrackingStatus";

export default function Track() {
  const r = useAppStore((s) => s.recording);
  const userId = useAuthStore((s) => s.session?.user.id);
  const event = useAppStore((s) => s.event);
  const setSport = useAppStore((s) => s.sport);
  const tracking = useTrackingStatus();
  const loc = useLiveLocation(r.mode === "gps");
  const [chooseSport, setChooseSport] = useState(false);
  if (r.ownerId && r.ownerId !== userId)
    return (
      <Screen>
        <Txt>
          En privat økt eller valgt rute tilhører en annen konto på enheten.
        </Txt>
        {r.status === "idle" && (
          <Button
            title="Fjern rutevalget"
            secondary
            onPress={() => event("discard")}
          />
        )}
        <Button
          title="Bytt konto for å fortsette"
          onPress={() => router.push("/account")}
        />
      </Screen>
    );
  return (
    <>
      <RecordingMap
        recording={r}
        position={loc.position}
        error={tracking.error ?? (r.mode === "gps" ? loc.error : null)}
        start={() => {
          if (r.mode !== "simulation" && !userId) router.push("/account");
          else void beginRecording("start");
        }}
        chooseSport={() => setChooseSport(true)}
        pause={() => event("pause")}
        resume={() => {
          void beginRecording("resume");
        }}
        finish={() => {
          event("finish");
          router.push("/summary");
        }}
      />
      {chooseSport && r.status === "idle" && (
        <SportPicker
          selected={[r.sport]}
          onSelect={(sport) => {
            useTrackingStatus.setState({ error: null });
            setSport(sport);
          }}
          onClose={() => setChooseSport(false)}
        />
      )}
    </>
  );
}
