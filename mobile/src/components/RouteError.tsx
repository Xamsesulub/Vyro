import { useEffect } from "react";
import { Text, View, Pressable } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { appPersistence, useAppStore } from "../stores/useAppStore";

// Self-contained fallback: avoid depending on the UI that may have failed.
export function RouteError({ retry }: ErrorBoundaryProps) {
  useEffect(() => {
    useAppStore.getState().event("pause");
    void appPersistence.flush();
  }, []);
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        backgroundColor: "#fff",
        padding: 28,
        gap: 20,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#11182C" }}>
        Denne siden kunne ikke vises
      </Text>
      <Text style={{ fontSize: 16, color: "#11182C" }}>
        Et pågående opptak er satt på pause. Prøv å åpne siden igjen.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void retry();
        }}
        style={{
          minHeight: 54,
          padding: 16,
          borderRadius: 16,
          backgroundColor: "#D7FF66",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#11182C",
            textAlign: "center",
          }}
        >
          Prøv igjen
        </Text>
      </Pressable>
    </View>
  );
}
