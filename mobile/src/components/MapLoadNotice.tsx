import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Txt } from "./ui";

/** Kept inside the map bounds: a sibling below a full-screen map is invisible. */
export function MapLoadNotice({
  message,
  top = 12,
  explorer = false,
  imagery = false,
  retryAt,
  onRetry,
}: {
  message: string;
  top?: number;
  explorer?: boolean;
  imagery?: boolean;
  retryAt: number;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const waiting = now < retryAt;
  useEffect(() => {
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [retryAt]);
  return (
    <View
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
      <View accessible accessibilityRole="alert" style={{ gap: 4 }}>
        <Txt weight="700" size={14} style={{ color: "#11182C" }}>
          {imagery
            ? "Satellittkartet kunne ikke lastes"
            : "Kartet kunne ikke lastes"}
        </Txt>
        <Txt size={13} style={{ color: "#53617B" }}>
          {message}
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Prøv kartet på nytt"
        accessibilityState={{ disabled: waiting }}
        disabled={waiting}
        onPress={onRetry}
        style={{
          minHeight: 44,
          justifyContent: "center",
          opacity: waiting ? 0.55 : 1,
        }}
      >
        <Txt size={14} weight="700" style={{ color: "#356618" }}>
          {waiting ? "Vent litt …" : "Prøv kartet på nytt"}
        </Txt>
      </Pressable>
    </View>
  );
}
