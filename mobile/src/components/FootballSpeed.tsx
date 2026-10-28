import { View } from "react-native";
import { Txt } from "./ui";
import { validMaxSpeed } from "../features/football/speed";

export function FootballSpeed({ value }: { value?: number | null }) {
  return (
    <View style={{ gap: 4 }}>
      <Txt weight="700" size={24}>
        {validMaxSpeed(value)
          ? `${value.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} km/t`
          : "—"}
      </Txt>
      <Txt muted size={12}>
        Maksfart · GPS over 5 sekunder
      </Txt>
      {!validMaxSpeed(value) && (
        <Txt muted size={12}>
          Ikke nok nøyaktige målinger i denne økten.
        </Txt>
      )}
    </View>
  );
}
