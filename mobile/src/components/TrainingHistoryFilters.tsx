import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Button, Chip, Txt, styles, useTheme } from "./ui";
import SportPicker from "./SportPicker";
import type { HistoryFilter } from "../features/activities/training";
export const initialHistoryFilter: HistoryFilter = {
  search: "",
  sport: "Alle",
  period: "all",
  source: "recorded",
};
export function TrainingHistoryFilters({
  filter,
  change,
  count,
}: {
  filter: HistoryFilter;
  change: (value: HistoryFilter) => void;
  count: number;
}) {
  const [selectSport, setSelectSport] = useState(false);
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
      {open && (
        <>
          <View style={styles.wrap}>
            <Chip
              title="Alle idretter"
              selected={filter.sport === "Alle"}
              onPress={() => change({ ...filter, sport: "Alle" })}
            />
            <Chip
              title={filter.sport === "Alle" ? "Velg idrett" : filter.sport}
              selected={filter.sport !== "Alle"}
              onPress={() => setSelectSport(true)}
            />
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
      {selectSport && (
        <SportPicker
          selected={filter.sport === "Alle" ? [] : [filter.sport]}
          onSelect={(sport) => change({ ...filter, sport })}
          onClose={() => setSelectSport(false)}
        />
      )}
      <Txt muted size={12}>
        {count} økter ·{" "}
        {["recorded", "gps", "timer"].includes(filter.source)
          ? "privat treningshistorikk"
          : "teller ikke i mål eller milepæler"}
      </Txt>
    </View>
  );
}
