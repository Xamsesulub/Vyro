import { useRef, useState } from "react";
import { Button, Card, Txt } from "./ui";
import type { Workout } from "../features/activities/model";
import { workoutGpx } from "../features/activities/gpx";
import { shareFile } from "../lib/shareFile";
import { useAuthStore } from "../stores/useAuthStore";

export function ExportWorkout({ workout }: { workout: Workout }) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  if (workout.source !== "gps" || !userId || workout.ownerId !== userId)
    return null;
  return (
    <>
      <Button
        title="Eksporter rute (GPX)"
        secondary
        onPress={() => {
          setConfirm(true);
          setError("");
        }}
      />
      {confirm && (
        <Card>
          <Txt weight="700">Ta med ruten til en annen app</Txt>
          <Txt muted>
            GPX-filen inneholder hele GPS-ruten, også start og slutt. Velg selv
            hvor den lagres eller deles. Private notater følger ikke med.
          </Txt>
          <Txt muted size={13}>
            Dette er en rutefil uten tidsstempler per punkt. Støtte for import
            varierer mellom apper.
          </Txt>
          <Button
            title={busy ? "Klargjør fil …" : "Lagre eller del GPX"}
            disabled={busy}
            onPress={async () => {
              if (pending.current) return;
              pending.current = true;
              setBusy(true);
              setError("");
              try {
                const file = workoutGpx(
                  workout,
                  useAuthStore.getState().session?.user.id,
                );
                await shareFile(
                  file,
                  () => useAuthStore.getState().session?.user.id === userId,
                );
                setConfirm(false);
              } catch {
                setError(
                  "Kunne ikke eksportere ruten. Sjekk ledig lagringsplass og prøv igjen.",
                );
              } finally {
                pending.current = false;
                setBusy(false);
              }
            }}
          />
          {!!error && <Txt>{error}</Txt>}
          <Button
            title="Avbryt eksport"
            secondary
            disabled={busy}
            onPress={() => setConfirm(false)}
          />
        </Card>
      )}
    </>
  );
}
