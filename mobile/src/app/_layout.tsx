import { useEffect } from "react";
import { AppState, View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";
import { useAppStore } from "../stores/useAppStore";
import { useTheme } from "../components/ui";
import { manageSupabaseSession } from "../lib/supabase";
import { observeAuth, useAuthStore } from "../stores/useAuthStore";

import { LocationWatcher } from "../components/LocationWatcher";

export default function RootLayout() {
  const ready = useAppStore((s) => s.ready);
  const theme = useAppStore((s) => s.theme);
  const c = useTheme();
  const reduced = useReducedMotion();
  const userId = useAuthStore((s) => s.session?.user.id);
  useEffect(() => {
    const r = useAppStore.getState().recording;
    if (r.ownerId && r.ownerId !== userId)
      useAppStore.getState().event("pause");
  }, [userId]);
  useEffect(manageSupabaseSession, []);
  useEffect(observeAuth, []);
  useEffect(() => {
    const timer = setInterval(() => {
      if (useAppStore.getState().recording.status === "recording")
        useAppStore.getState().tick();
    }, 1000);
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active") useAppStore.getState().event("pause");
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocationWatcher />
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        {!ready ? (
          <View
            style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}
          >
            <ActivityIndicator
              color={c.accent}
              accessibilityLabel="Laster VYRO"
            />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: c.bg },
              animation: reduced ? "none" : "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="summary"
              options={{ presentation: "modal", gestureEnabled: false }}
            />
            <Stack.Screen name="activity/[id]" />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
