import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  Badge,
  Card,
  Chip,
  Header,
  Icon,
  Metric,
  Ring,
  Screen,
  Section,
  Txt,
  styles,
  useTheme,
} from "../../components/ui";
import { useAppStore } from "../../stores/useAppStore";
import { examples } from "../../features/activities/examples";
import { km, total, weekWorkouts } from "../../features/activities/model";
import { brand } from "../../theme/tokens";

export default function Progress() {
  const s = useAppStore();
  const c = useTheme();
  const [period, setPeriod] = useState<"Uke" | "Måned">("Uke");
  const [selected, setSelected] = useState<number | null>(null);
  const all = s.examplesVisible ? [...s.workouts, ...examples] : s.workouts;
  const now = new Date();
  const list =
    period === "Uke"
      ? weekWorkouts(all)
      : all.filter(
          (w) =>
            new Date(w.date).getMonth() === now.getMonth() &&
            new Date(w.date).getFullYear() === now.getFullYear(),
        );
  const stats = total(list);
  const days =
    period === "Uke"
      ? 7
      : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const buckets = Array.from({ length: days }, (_, i) =>
    list
      .filter((w) =>
        period === "Uke"
          ? (new Date(w.date).getDay() + 6) % 7 === i
          : new Date(w.date).getDate() === i + 1,
      )
      .reduce((sum, w) => sum + w.distance, 0),
  );
  const max = Math.max(...buckets, 1);
  const weekly = total(weekWorkouts(all));
  return (
    <Screen>
      <Header
        eyebrow="Dine aktiviteter"
        title="Fremgang"
        right={<Icon name="chart" size={32} color={brand.lavender} />}
      />
      <View style={styles.wrap}>
        {(["Uke", "Måned"] as const).map((p) => (
          <Chip
            key={p}
            title={p}
            selected={period === p}
            onPress={() => {
              setPeriod(p);
              setSelected(null);
            }}
          />
        ))}
      </View>
      <Badge
        text={
          s.examplesVisible ? "Inkluderer eksempeldata" : "Kun dine egne økter"
        }
      />
      <Card>
        <Txt muted size={12}>
          {selected === null
            ? "TOTAL DISTANSE"
            : `${period === "Uke" ? ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"][selected] : `Dag ${selected + 1}`}`}
        </Txt>
        <Txt size={48} weight="700" style={{ letterSpacing: -2 }}>
          {km(selected === null ? stats.distance : buckets[selected])}{" "}
          <Txt size={18} muted>
            km
          </Txt>
        </Txt>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            height: 160,
            gap: period === "Uke" ? 10 : 3,
          }}
        >
          {buckets.map((value, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${period === "Uke" ? ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"][i] : `Dag ${i + 1}`}: ${km(value)} kilometer`}
              onPress={() => setSelected(selected === i ? null : i)}
              style={{
                flex: 1,
                height: "100%",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <View
                style={{
                  borderRadius: 5,
                  minHeight: 4,
                  height: `${Math.max(2, (value / max) * 82)}%`,
                  backgroundColor:
                    selected === i
                      ? brand.lavender
                      : value
                        ? brand.lime
                        : c.raised,
                }}
              />
              {period === "Uke" && (
                <Txt size={11} muted style={{ textAlign: "center" }}>
                  {["M", "T", "O", "T", "F", "L", "S"][i]}
                </Txt>
              )}
            </Pressable>
          ))}
        </View>
        <Txt muted size={11}>
          Trykk på en søyle for å se dagen.
        </Txt>
      </Card>
      <View style={styles.row}>
        <Card style={{ flex: 1 }}>
          <Metric value={String(list.length)} label="økter i perioden" />
        </Card>
        <Card style={{ flex: 1 }}>
          <Metric
            value={`${Math.round(stats.seconds / 60)}`}
            label="aktive minutter"
          />
        </Card>
      </View>
      <Section title="Ditt ukemål" />
      <Card>
        <View style={styles.row}>
          <Ring progress={weekly.distance / s.goal} />
          <View style={{ flex: 1, gap: 8 }}>
            <Txt size={22} weight="700">
              {s.goal} km denne uken
            </Txt>
            <Txt muted size={14}>
              {km(Math.max(0, s.goal - weekly.distance))} km igjen · alle
              aktiviteter
            </Txt>
          </View>
        </View>
        <View style={styles.wrap}>
          {[10, 20, 30, 50].map((n) => (
            <Chip
              key={n}
              title={`${n} km`}
              selected={s.goal === n}
              onPress={() => s.preferences({ goal: n })}
            />
          ))}
        </View>
      </Card>
      <Section title="Din bevegelsesmiks" />
      <Card>
        {["Løping", "Gange", "Sykling", "Fottur"].map((sport) => {
          const count = list.filter((w) => w.sport === sport).length;
          return (
            <View key={sport} style={styles.row}>
              <Txt size={14}>{sport}</Txt>
              <Txt muted size={14}>
                {count} {count === 1 ? "økt" : "økter"}
              </Txt>
            </View>
          );
        })}
      </Card>
      <Txt muted size={12}>
        Statistikken kan inkludere eksempeldata og simuleringer. Personlige
        rekorder beregnes først fra faktiske opptak i en senere fase.
      </Txt>
    </Screen>
  );
}
