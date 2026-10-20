import { useMemo, useState } from "react";
import { View } from "react-native";
import { Screen, Txt, Chip, styles } from "../../components/ui";
import WorkoutMap from "../../components/WorkoutMap";
import { demoTurfs, people } from "../../features/social/demo";
import { useSocialStore } from "../../stores/useSocialStore";
import { useAppStore } from "../../stores/useAppStore";
import { duration, km } from "../../features/activities/model";
import { hasMapbox } from "../../features/maps/config";
export default function Maps() {
  const following = useSocialStore((s) => s.following);
  const examples = useAppStore((s) => s.examplesVisible);
  const [filter, setFilter] = useState("Følger");
  const turfs = useMemo(
    () =>
      examples
        ? demoTurfs.filter(
            (t) => filter === "Alle eksempler" || following.includes(t.ownerId),
          )
        : [],
    [examples, following, filter],
  );
  const routes = useMemo(
    () =>
      turfs.map((t) => ({
        id: t.id,
        name: t.name,
        owner: people.find((p) => p.id === t.ownerId)?.name ?? "Ukjent",
        points: t.points,
        color: t.color,
      })),
    [turfs],
  );
  const empty = useMemo(() => [], []);
  return (
    <Screen>
      <Txt size={28} weight="700">
        Turf
      </Txt>
      <View style={styles.wrap}>
        {["Følger", "Alle eksempler"].map((t) => (
          <Chip
            key={t}
            title={t}
            selected={t === filter}
            onPress={() => setFilter(t)}
          />
        ))}
      </View>
      <WorkoutMap height={340} points={empty} routes={routes} />
      <Txt size={12} muted>
        {hasMapbox ? "Mapbox" : "Ekte kart · Mapbox ikke konfigurert"} · turfene
        er eksempler
      </Txt>
      {turfs.map((t) => (
        <View key={t.id} style={{ gap: 6, paddingVertical: 12 }}>
          <Txt size={20} weight="700">
            {t.name}
          </Txt>
          <Txt>
            {people.find((p) => p.id === t.ownerId)?.name} eier denne
            eksempel-turfen
          </Txt>
          <Txt muted>
            {km(t.distance)} km · tid å slå: {duration(t.seconds)}
          </Txt>
        </View>
      ))}
      {!turfs.length && <Txt muted>Ingen turfs fra løpere du følger.</Txt>}
      <Txt weight="700">Slik overtar du</Txt>
      <Txt muted size={14}>
        Løp hele løypen i samme retning. Laveste totaltid fra start til mål
        vinner. Pauser teller med. Ekstra kilometer etter mål endrer ikke denne
        turf-tiden.
      </Txt>
      <Txt muted size={12}>
        Ekte overtakelse krever GPS-opptak og serverkontroll. Simuleringer kan
        ikke vinne turf.
      </Txt>
    </Screen>
  );
}
