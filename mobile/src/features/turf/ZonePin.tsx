import { useState } from "react";
import { Image, Text, View } from "react-native";
import { useAvatar } from "../social/avatar";

export function ZonePin({
  name,
  path,
  color,
  selected,
  onReady,
}: {
  name: string;
  path?: string | null;
  color: string;
  selected: boolean;
  onReady?: () => void;
}) {
  const uri = useAvatar(path);
  const [failed, setFailed] = useState<string | null>(null);
  const size = selected ? 60 : 48;
  return (
    <View
      accessible
      accessibilityLabel={`${name} eier sonen`}
      onLayout={onReady}
      style={{ alignItems: "center", width: 112, paddingTop: 4 }}
    >
      <View
        style={{
          borderWidth: 3,
          borderColor: color,
          borderRadius: 100,
          padding: 3,
          backgroundColor: "white",
          boxShadow: "0 3px 8px #11182C30",
        }}
      >
        {uri && failed !== uri ? (
          <Image
            source={{ uri }}
            onLoad={onReady}
            onError={() => {
              setFailed(uri);
              onReady?.();
            }}
            style={{ width: size, height: size, borderRadius: 100 }}
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: 100,
              backgroundColor: `${color}40`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#11182C", fontSize: 23, fontWeight: "700" }}>
              {name.trim().slice(0, 1).toLocaleUpperCase("nb-NO")}
            </Text>
          </View>
        )}
      </View>
      <View
        style={{
          marginTop: -9,
          backgroundColor: "white",
          borderRadius: 13,
          maxWidth: 110,
          paddingHorizontal: 10,
          paddingVertical: 3,
          zIndex: 1,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ color: "#11182C", fontSize: 13, fontWeight: "700" }}
        >
          {name}
        </Text>
      </View>
      <View
        style={{
          borderTopWidth: 12,
          borderLeftWidth: 9,
          borderRightWidth: 9,
          borderTopColor: color,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
        }}
      />
    </View>
  );
}
