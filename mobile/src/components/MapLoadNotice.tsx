import { View } from "react-native";
import { Txt } from "./ui";

/** Kept inside the map bounds: a sibling below a full-screen map is invisible. */
export function MapLoadNotice({
  message,
  top = 12,
  explorer = false,
}: {
  message: string;
  top?: number;
  explorer?: boolean;
}) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        position: "absolute",
        top,
        left: 12,
        right: explorer ? 80 : 12,
        maxWidth: 360,
        padding: 14,
        borderRadius: 14,
        backgroundColor: "white",
        borderColor: "#E7E9E5",
        borderWidth: 1,
        gap: 4,
      }}
    >
      <Txt weight="700" size={14} style={{ color: "#11182C" }}>
        Kartet er utilgjengelig
      </Txt>
      <Txt size={13} style={{ color: "#53617B" }}>
        {message}
      </Txt>
    </View>
  );
}
