import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Button, Chip, Txt, styles, useTheme } from "./ui";
import { sports } from "../features/activities/model";
import type { HistoryFilter } from "../features/activities/training";
export const initialHistoryFilter: HistoryFilter = {
  search: "",
  sport: "Alle",
  period: "all",
  source: "gps",
};
export function TrainingHistoryFilters({
  filter,
  change,
  examples,
  count,
}: {
  filter: HistoryFilter;
  change: (value: HistoryFilter) => void;
  examples: boolean;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const c = useTheme();
  return (
    <View style={{ padding: 20, gap: 14, backgroundColor: c.surface }}>
      <View style={styles.row}>
        <Txt size={20} weight="700">
          Treningslogg
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Txt size={14} style={{ color: c.accent }}>
            Filtrer
          </Txt>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Søk i treningsloggen"
        placeholder="Finn en tur etter navn"
        placeholderTextColor={c.muted}
        value={filter.search}
        onChangeText={(search) => change({ ...filter, search })}
        style={{
          color: c.text,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 14,
        }}
      />
      <View style={styles.wrap}>
        {(
          [
            ["gps", "GPS-økter"],
            ["simulation", "Simuleringer"],
            ...(examples ? [["example", "Eksempler"]] : []),
          ] as [HistoryFilter["source"], string][]
        ).map(([source, title]) => (
          <Chip
            key={source}
            title={title}
            selected={filter.source === source}
            onPress={() => change({ ...filter, source })}
          />
        ))}
      </View>
      {open && (
        <>
          <View style={styles.wrap}>
            {(["Alle", ...sports] as const).map((sport) => (
              <Chip
                key={sport}
                title={sport}
                selected={filter.sport === sport}
                onPress={() => change({ ...filter, sport })}
              />
            ))}
          </View>
          <View style={styles.wrap}>
            {(
              [
                ["all", "Alle datoer"],
                ["week", "Denne uken"],
                ["month", "Denne måneden"],
              ] as const
            ).map(([period, title]) => (
              <Chip
                key={period}
                title={title}
                selected={filter.period === period}
                onPress={() => change({ ...filter, period })}
              />
            ))}
          </View>
          <Button
            title="Nullstill filtre"
            secondary
            onPress={() =>
              change({ ...initialHistoryFilter, source: filter.source })
            }
          />
        </>
      )}
      <Txt muted size={12}>
        {count} økter ·{" "}
        {filter.source === "gps"
          ? "privat treningshistorikk"
          : "teller ikke i mål eller milepæler"}
      </Txt>
    </View>
  );
}
