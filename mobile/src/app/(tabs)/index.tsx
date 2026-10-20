import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ActivityCard } from "../../components/ActivityCard";
import { PositionCard } from "../../components/PositionCard";
import {
  Badge,
  Button,
  Card,
  Header,
  Icon,
  Logo,
  Metric,
  Ring,
  Screen,
  Section,
  Txt,
  styles,
  useTheme,
} from "../../components/ui";
import { examples } from "../../features/activities/examples";
import { km, total, weekWorkouts } from "../../features/activities/model";
import { useAppStore } from "../../stores/useAppStore";
import { brand } from "../../theme/tokens";

export default function Home() {
  const s = useAppStore();
  const c = useTheme();
  const list = s.examplesVisible ? [...s.workouts, ...examples] : s.workouts;
  const week = weekWorkouts(list);
  const stats = total(week);
  const ratio = stats.distance / s.goal;
  return (
    <Screen>
      <View style={styles.row}>
        <Logo small />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Åpne profil"
          onPress={() => router.push("/(tabs)/profile")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.raised,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Txt weight="700">
            {s.name ? s.name.charAt(0).toUpperCase() : "V"}
          </Txt>
        </Pressable>
      </View>
      <Header
        eyebrow="Din oversikt"
        title={`Hei${s.name ? `, ${s.name}` : ""}`}
      />
      <Button
        title={
          s.recording.status === "idle" ? "Start en økt" : "Tilbake til økten"
        }
        icon="play"
        onPress={() => router.push("/(tabs)/track")}
      />
      <View style={{ gap: 12 }}>
        <Section title="Din posisjon" />
        <PositionCard />
      </View>
      <View style={{ gap: 12 }}>
        <Section
          title="Denne uken"
          action="Se fremgang"
          onPress={() => router.push("/(tabs)/progress")}
        />
        {s.examplesVisible && <Badge text="Inkluderer eksempeldata" />}
        <Card>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 12 }}>
              <Txt size={12} muted>
                DITT UKEMÅL
              </Txt>
              <Txt size={36} weight="700" style={{ letterSpacing: -1 }}>
                {km(stats.distance)}{" "}
                <Txt size={16} muted>
                  / {s.goal} km
                </Txt>
              </Txt>
              <Txt size={13} style={{ color: c.accent }}>
                {ratio >= 1
                  ? "Målet er nådd. Nyt en hviledag også."
                  : `${Math.round(ratio * 100)} % av veien. Ett steg om gangen.`}
              </Txt>
            </View>
            <Ring progress={ratio} size={86} />
          </View>
          <View style={{ height: 1, backgroundColor: c.border }} />
          <View style={styles.row}>
            <Metric value={String(week.length)} label="økter" />
            <Metric
              value={`${Math.round(stats.seconds / 60)}`}
              label="aktive minutter"
            />
            <Icon name="chart" color={brand.lavender} size={36} />
          </View>
        </Card>
      </View>
      <View style={{ gap: 14 }}>
        <Section
          title="Siste økter"
          action="Alle økter"
          onPress={() => router.push("/(tabs)/profile")}
        />
        {list.length ? (
          list.slice(0, 2).map((w) => <ActivityCard key={w.id} workout={w} />)
        ) : (
          <Card>
            <Icon name="run" />
            <Txt weight="700">Din historie starter her</Txt>
            <Txt muted>Fullfør en økt for å bygge historikken din.</Txt>
          </Card>
        )}
      </View>
    </Screen>
  );
}
