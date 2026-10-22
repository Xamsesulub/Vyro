import { useState } from "react";
import { TextInput, View } from "react-native";
import { Button, Chip, Txt, styles, useTheme } from "./ui";
import { sports } from "../features/activities/model";
import { WeeklyGoal } from "../features/activities/training";

export function GoalEditor({
  goal,
  save,
  close,
}: {
  goal: WeeklyGoal;
  save: (goal: WeeklyGoal) => void;
  close: () => void;
}) {
  const [kind, setKind] = useState(goal.kind);
  const [sport, setSport] = useState(goal.sport);
  const [target, setTarget] = useState(String(goal.target));
  const c = useTheme();
  const number = Number(target.replace(",", "."));
  const valid =
    Number.isFinite(number) &&
    number > 0 &&
    number <= 10000 &&
    (kind !== "sessions" || Number.isInteger(number));
  return (
    <View style={{ gap: 14 }}>
      <Txt weight="700">Ditt ukemål</Txt>
      <View style={styles.wrap}>
        {(
          [
            ["distance", "Kilometer"],
            ["minutes", "Minutter"],
            ["sessions", "Økter"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            title={label}
            selected={kind === value}
            onPress={() => {
              setKind(value);
              setTarget(
                value === "sessions" ? "3" : value === "minutes" ? "90" : "15",
              );
            }}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Antall i ukemålet"
        keyboardType="decimal-pad"
        value={target}
        onChangeText={setTarget}
        maxLength={7}
        style={{
          color: c.text,
          backgroundColor: c.raised,
          padding: 16,
          borderRadius: 12,
          fontSize: 18,
        }}
      />
      <View style={styles.wrap}>
        {(["Alle", ...sports] as const).map((value) => (
          <Chip
            key={value}
            title={value}
            selected={sport === value}
            onPress={() => setSport(value)}
          />
        ))}
      </View>
      {!valid && (
        <Txt muted>Velg et positivt tall. Antall økter må være et heltall.</Txt>
      )}
      <Button
        title="Lagre ukemål"
        disabled={!valid}
        onPress={() => save({ kind, sport, target: number })}
      />
      <Button title="Avbryt endring" secondary onPress={close} />
    </View>
  );
}
