import { useState } from "react";
import { Switch, View } from "react-native";
import { router } from "expo-router";
import { Screen, Txt, Button } from "../components/ui";
import WorkoutMap from "../components/WorkoutMap";
import FootballMap from "../components/FootballMap";
import { publicationRoute } from "../features/football/sharing";
import { useAppStore } from "../stores/useAppStore";
import { shareable } from "../stores/useSocialStore";
import { useAuthStore } from "../stores/useAuthStore";
import { publish, socialError } from "../features/social/api";
import { AccountGate } from "../components/AccountGate";
import { km, duration } from "../features/activities/model";
import { hasVisibleSegment, WORKOUT_SHARING_RADIUS_METERS } from "../features/social/routePrivacy";
import { useOwnProfile } from "../features/auth/useOwnProfile";
export default function ShareWorkout() {
  const id = useAuthStore((s) => s.session?.user.id);
  return <AccountGate>{id && <ShareForm key={id} userId={id} />}</AccountGate>;
}
function ShareForm({ userId }: { userId: string }) {
  const {profile}=useOwnProfile();
  const workouts = useAppStore((s) => s.workouts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [wholeRouteFor, setWholeRouteFor] = useState<string | null>(null);
  const [audience, setAudience] = useState<"followers" | "everyone">(
    () =>
      useAppStore.getState().sharingAudienceByOwner?.[userId] ?? "followers",
  );
  const eligible = workouts.filter((w) => shareable(w) && w.ownerId === userId);
  const workout = eligible.find((w) => w.id === selected);
  const wholeRoute = !!workout && wholeRouteFor === workout.id;
  const route = publicationRoute(workout, wholeRoute);
  const canShare = workout?.source === "timer" || hasVisibleSegment(route);
  return (
    <Screen>
      <Button title="Tilbake" secondary onPress={() => router.back()} />
      <Txt size={28} weight="700">
        Del en økt
      </Txt>
      <Txt muted>
        Del en fullført økt. GPS-økter viser også rute og distanse. Private
        notater og anstrengelse følger ikke med.
      </Txt>
      <Txt muted size={12}>
        Velg hvem som får se økten. Du kan endre forvalget i
        personverninnstillingene.
      </Txt>
      <Button
        secondary
        title={
          profile?.is_private ? "Synlig for: Godkjente følgere" : audience === "followers"
            ? "Synlig for: Følgere"
            : "Synlig for: Alle innloggede"
        }
        onPress={() =>
          setAudience(audience === "followers" ? "everyone" : "followers")
        }
        disabled={busy || !profile || profile.is_private}
      />
      {eligible.map((w) => (
        <Button
          key={w.id}
          title={w.title}
          secondary
          disabled={busy}
          onPress={() => {
            setSelected(w.id);
            setWholeRouteFor(null);
            setError("");
          }}
        />
      ))}
      {!eligible.length && (
        <Txt>Ingen delbare økter ennå. Fullfør og lagre en økt først.</Txt>
      )}
      {!!error && <Txt>{error}</Txt>}
      {workout && (
        <View style={{ gap: 16 }}>
          <Txt weight="700">{workout.title}</Txt>
          <Txt>
            {workout.source === "gps" ? `${km(workout.distance)} km · ` : ""}
            {duration(workout.seconds)}
          </Txt>
          {workout.sport === "Fotball" && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <Txt weight="700" style={{ flex: 1 }}>
                  Del hele fotballruten
                </Txt>
                <Switch
                  accessibilityLabel="Del hele fotballruten"
                  value={wholeRoute}
                  disabled={busy}
                  onValueChange={(value) =>
                    setWholeRouteFor(value ? workout.id : null)
                  }
                />
              </View>
              <Txt muted size={13}>
                En bane ligger ofte innenfor skjermingen på {WORKOUT_SHARING_RADIUS_METERS} meter. Slår du
                på dette, deles hele ruten, også start, slutt og eventuell vei
                til og fra banen.
              </Txt>
            </>
          )}
          {!canShare || workout.source === "timer" ? null : workout.sport === "Fotball" ? (
            <FootballMap
              key={`${workout.id}:${wholeRoute}`}
              points={route}
              height={250}
            />
          ) : (
            <WorkoutMap points={route} height={220} />
          )}
          {workout.source === "gps" && (
            <Txt muted size={13}>
              {wholeRoute ? (
                "Hele ruten i forhåndsvisningen blir delt med valgt publikum. Start og slutt er synlige. "
              ) : (
                <>
                  Kartet skjuler punkter innen {WORKOUT_SHARING_RADIUS_METERS} meter fra start og slutt,
                  også når du passerer dem senere. Distanse og tid gjelder hele
                  økten. Kontroller kartet: andre detaljer kan fortsatt avsløre
                  hvor du bor.{" "}
                </>
              )}
              Deling på nytt oppdaterer kart og publikum på det eksisterende
              innlegget.
            </Txt>
          )}
          {!canShare && (
            <Txt>Ingen delbar rute er igjen når punktene innen {WORKOUT_SHARING_RADIUS_METERS} meter fra start og slutt skjules. Turen på {km(workout.distance)} km er fortsatt lagret privat. Du trenger en rute som går utenfor disse områdene for å dele den med kart.</Txt>
          )}
          <Button
            title={
              busy
                ? "Publiserer …"
                : workout.source === "timer"
                  ? "Publiser økten"
                  : "Publiser økten med kart"
            }
            disabled={busy || !canShare}
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              setError("");
              try {
                await publish(workout, userId, profile?.is_private ? "followers" : audience, wholeRoute);
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
