import { View } from "react-native";
import { Txt } from "./ui";
import { palettes } from "../theme/tokens";
export default function MapUnavailable({
  height = 300,
  message = "Kartet er ikke satt opp på denne enheten ennå.",
}: {
  height?: number;
  message?: string;
}) {
  return (
    <View
      accessibilityRole="text"
      style={{
        minHeight: height,
        backgroundColor: "#F4F5F2",
        padding: 24,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Txt weight="600" style={{ color: palettes.light.text }}>
        Kart utilgjengelig
      </Txt>
      <Txt style={{ textAlign: "center", color: palettes.light.muted }}>
        {message}
      </Txt>
    </View>
  );
}
