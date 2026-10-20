import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Txt, Button } from "../components/ui";
import WorkoutMap from "../components/WorkoutMap";
import { useAppStore } from "../stores/useAppStore";
import { shareable } from "../stores/useSocialStore";
import { useAuthStore } from "../stores/useAuthStore";
import { publish, socialError } from "../features/social/api";
import { AccountGate } from "../components/AccountGate";
import { km, duration } from "../features/activities/model";
export default function ShareWorkout() {
  const id = useAuthStore((s) => s.session?.user.id);
  return <AccountGate>{id && <ShareForm key={id} userId={id} />}</AccountGate>;
}
function ShareForm({ userId }: { userId: string }) {
  const workouts = useAppStore((s) => s.workouts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const eligible = workouts.filter((w) => shareable(w) && w.ownerId === userId);
  const workout = eligible.find((w) => w.id === selected);
  return (
    <Screen>
      <Button title="Tilbake" secondary onPress={() => router.back()} />
      <Txt size={28} weight="700">
        Del en økt
      </Txt>
      <Txt muted>
        Kun fullførte GPS-økter kan bli innlegg. Kart, distanse, tid og tempo
        følger alltid med.
      </Txt>
      <Txt muted size={12}>
        Innlegget blir synlig for alle innloggede VYRO-brukere.
      </Txt>
      {eligible.map((w) => (
        <Button
          key={w.id}
          title={w.title}
          secondary
          onPress={() => setSelected(w.id)}
        />
      ))}
      {!eligible.length && (
        <Txt>
          Ingen delbare GPS-økter. Simuleringer og økter uten rute kan ikke
          deles.
        </Txt>
      )}
      {!!error && <Txt>{error}</Txt>}
      {workout && (
        <View style={{ gap: 16 }}>
          <Txt weight="700">{workout.title}</Txt>
          <Txt>
            {km(workout.distance)} km · {duration(workout.seconds)}
          </Txt>
          <WorkoutMap points={workout.route} height={220} />
          <Txt muted size={13}>
            Hele denne ruten blir synlig i innlegget. Kontroller start og slutt
            før du deler.
          </Txt>
          <Button
            title={busy ? "Publiserer …" : "Publiser økten med kart"}
            disabled={busy}
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              setError("");
              try {
                await publish(workout, userId);
                router.replace("/(tabs)");
              } catch (e) {
                setError(socialError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      )}
    </Screen>
  );
}
