import WorkoutMap from "../../components/WorkoutMap";
import FootballMap from "../../components/FootballMap";
import { ExportWorkout } from "../../components/ExportWorkout";
import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Header,
  Icon,
  Screen,
  Txt,
  styles,
} from "../../components/ui";

import { useAppStore } from "../../stores/useAppStore";
import { useVisibleWorkouts } from "../../features/activities/useVisibleWorkouts";
import { duration, isRecordedWorkout } from "../../features/activities/model";
import WorkoutStats from "../../components/WorkoutStats";
export default function Activity() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const remove = useAppStore((s) => s.remove);
  const workouts = useVisibleWorkouts();
  const [repeatError, setRepeatError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const w = workouts.find((item) => item.id === id);
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile");
  };
  if (!w)
    return (
      <Screen>
        <Txt size={24}>Økten finnes ikke.</Txt>
        <Button
          title="Til historikken"
          onPress={() => router.replace("/(tabs)/profile")}
        />
      </Screen>
    );
  return (
    <Screen>
      <Button title="Tilbake" secondary onPress={back} />
      <Header
        eyebrow={`${w.sport} · ${new Date(w.date).toLocaleDateString("nb-NO")}`}
        title={w.title}
      />
      <Badge
        text={
          w.source === "example"
            ? "Eksempeløkt"
            : w.source === "gps"
              ? "GPS-økt"
              : w.source === "timer"
                ? "Tidtaking"
                : "Lagret simulering"
        }
      />
      {w.route &&
        w.route.length > 1 &&
        (w.sport === "Fotball" && w.source === "gps" ? (
          <FootballMap key={w.id} points={w.route} />
        ) : (
          <WorkoutMap points={w.route} />
        ))}
      <Card>
        <WorkoutStats
          sport={w.sport}
          seconds={w.seconds}
          distance={w.distance}
          timerOnly={w.source === "timer"}
          maxSpeed={w.maxSpeedKmh}
        />
        {w.workoutType && <Txt>{w.workoutType}</Txt>}
        {w.effort !== undefined && (
          <Txt muted>Anstrengelse: {w.effort} av 10 · privat</Txt>
        )}
      </Card>

      {!!w.splits?.length && (
        <Card>
          <Txt weight="700">Kilometertider</Txt>
          {w.splits.map((split) => (
            <View key={split.kilometer} style={styles.row}>
              <Txt>Km {split.kilometer}</Txt>
              <Txt>{duration(split.seconds)}</Txt>
            </View>
          ))}
        </Card>
      )}
      {w.source === "gps" && !!w.route && w.route.length > 1 && (
        <>
          <Button
            title="Gjenta denne ruten"
            icon="map"
            onPress={() => {
              if (useAppStore.getState().repeatRoute(w))
                router.push("/(tabs)/track");
              else setRepeatError(true);
            }}
          />
          {repeatError && (
            <Txt muted>
              Fullfør den pågående økten før du velger en ny rute.
            </Txt>
          )}
        </>
      )}
      <Card>
        <View style={styles.row}>
          <Icon name="lock" />
          <Txt weight="600" style={{ flex: 1 }}>
            Privat økt
          </Txt>
        </View>
        <Txt muted>{w.notes || "Ingen notater."}</Txt>
        <Txt muted size={12}>
          {w.source === "example"
            ? "Dette er en fiktiv økt for å vise produktet."
            : isRecordedWorkout(w)
              ? "Dette er den private kopien på enheten. Eventuell sikkerhetskopi beholdes ved lokal sletting. Deling trekkes tilbake fra Hjem."
              : "Simuleringen er lagret lokalt. Den teller ikke som et ekte treningsopptak."}
        </Txt>
      </Card>
      {w.source !== "example" && (
        <>
          <ExportWorkout key={w.id} workout={w} />
          {isRecordedWorkout(w) && (
            <Button
              title="Del økten"
              icon="share"
              secondary
              onPress={() => router.push("/share-workout")}
            />
          )}
          {w.source === "gps" && w.sport === "Løping" && (
            <Button
              title={w.turfId ? "Send soneforsøk" : "Legg ut som sone"}
              icon="trophy"
              onPress={() =>
                router.push({
                  pathname: "/turf",
                  params: {
                    workoutId: w.id,
                    ...(w.turfId ? { turfId: w.turfId } : {}),
                  },
                })
              }
            />
          )}
          <Button
            title={
              confirm
                ? "Bekreft sletting"
                : isRecordedWorkout(w)
                  ? "Slett fra denne enheten"
                  : "Slett simuleringen"
            }
            secondary={!confirm}
            danger={confirm}
            onPress={() => {
              if (!confirm) setConfirm(true);
              else {
                remove(w.id);
                router.replace("/(tabs)/profile");
              }
            }}
          />
          {confirm && (
            <Button
              title="Avbryt"
              secondary
              onPress={() => setConfirm(false)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
