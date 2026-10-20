import { View } from "react-native";
import { Txt } from "./ui";
export default function MapUnavailable({
  height = 300,
  message = "Kartet blir tilgjengelig når Mapbox er aktivert.",
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
      <Txt weight="600">Kart utilgjengelig</Txt>
      <Txt muted style={{ textAlign: "center" }}>
        {message}
      </Txt>
    </View>
  );
}
