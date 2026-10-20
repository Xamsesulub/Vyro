import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Button, Chip, Screen, Txt, styles, useTheme } from "../components/ui";
import { useAppStore } from "../stores/useAppStore";
import { useVisibleWorkouts } from "../features/activities/useVisibleWorkouts";
import { examples } from "../features/activities/examples";
import { km, total, weekWorkouts } from "../features/activities/model";
export default function Progress() {
  const s = useAppStore();
  const workouts = useVisibleWorkouts();
  const c = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const list = weekWorkouts(
    s.examplesVisible ? [...workouts, ...examples] : workouts,
  );
  const stats = total(list);
  const labels = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  const values = labels.map((_, i) =>
    list
      .filter((w) => (new Date(w.date).getDay() + 6) % 7 === i)
      .reduce((sum, w) => sum + w.distance, 0),
  );
  const max = Math.max(...values, 1);
  return (
    <Screen>
      <Button
        title="Tilbake til Du"
        secondary
        onPress={() => router.replace("/profile")}
      />
      <Txt size={28} weight="700">
        Treningslogg
      </Txt>
      <Txt size={18} weight="600">
        Denne uken
      </Txt>
      <Txt size={38} weight="700">
        {km(selected === null ? stats.distance : values[selected])} km
      </Txt>
      <Txt muted size={13}>
        {selected === null ? "Alle aktiviteter" : labels[selected]}
      </Txt>
      <View style={{ flexDirection: "row", height: 150, gap: 8 }}>
        {values.map((value, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`${labels[i]}: ${km(value)} kilometer`}
            accessibilityState={{ selected: selected === i }}
            onPress={() => setSelected(selected === i ? null : i)}
            style={{
              flex: 1,
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: "70%",
                height: Math.max(3, (value / max) * 110),
                borderRadius: 3,
                backgroundColor: selected === i ? c.text : c.accent,
              }}
            />
            <Txt muted size={11}>
              {labels[i]}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Txt muted size={12}>
        {s.examplesVisible
          ? "Inkluderer eksempeldata"
          : "Simulerte aktiviteter"}
      </Txt>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.border,
          paddingTop: 24,
          gap: 16,
        }}
      >
        <Txt size={20} weight="700">
          Ukentlig distansemål
        </Txt>
        <Txt muted>
          {km(stats.distance)} av {s.goal} km
        </Txt>
        <View style={styles.wrap}>
          {[10, 20, 30, 50].map((goal) => (
            <Chip
              key={goal}
              title={`${goal} km`}
              selected={goal === s.goal}
              onPress={() => s.preferences({ goal })}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}
