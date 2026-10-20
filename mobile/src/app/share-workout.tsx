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
import {
  sharedRoute,
  hasVisibleSegment,
} from "../features/social/routePrivacy";
export default function ShareWorkout() {
  const id = useAuthStore((s) => s.session?.user.id);
  return <AccountGate>{id && <ShareForm key={id} userId={id} />}</AccountGate>;
}
function ShareForm({ userId }: { userId: string }) {
  const workouts = useAppStore((s) => s.workouts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [audience, setAudience] = useState<"followers" | "everyone">(
    "followers",
  );
  const eligible = workouts.filter((w) => shareable(w) && w.ownerId === userId);
  const workout = eligible.find((w) => w.id === selected);
  const route = sharedRoute(workout?.route);
  const canShare = hasVisibleSegment(route);
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
        Velg hvem som får se økten. Følgere er standard.
      </Txt>
      <Button
        secondary
        title={
          audience === "followers"
            ? "Synlig for: Følgere"
            : "Synlig for: Alle innloggede"
        }
        onPress={() =>
          setAudience(audience === "followers" ? "everyone" : "followers")
        }
        disabled={busy}
      />
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
          <WorkoutMap points={route} height={220} />
          <Txt muted size={13}>
            Kartet skjuler punkter innen 500 meter fra start og slutt, også når
            du passerer dem senere. Distanse og tid gjelder hele økten.
            Kontroller kartet: andre detaljer kan fortsatt avsløre hvor du bor.
            Deling på nytt oppdaterer kart og publikum på det eksisterende
            innlegget.
          </Txt>
          {!canShare && (
            <Txt>Ruten er for kort til å dele med skjermet start og slutt.</Txt>
          )}
          <Button
            title={busy ? "Publiserer …" : "Publiser økten med kart"}
            disabled={busy || !canShare}
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              setError("");
              try {
                await publish(workout, userId, audience);
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
