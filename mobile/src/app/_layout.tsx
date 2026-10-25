import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";
import { useAppStore } from "../stores/useAppStore";
// Migrate legacy private GPS drafts on launch, including lazy web routes.
import "../stores/useGpsStore";
import { Button, Txt, useTheme } from "../components/ui";
import { manageSupabaseSession } from "../lib/supabase";
import { observeAuth, useAuthStore } from "../stores/useAuthStore";

import { LocationWatcher } from "../components/LocationWatcher";
import { LaunchSignature } from "../components/motion";
import { observeKilometerAlerts } from "../features/tracking/alerts";
import { observeBackups } from "../features/backup/sync";
import { cleanExports } from "../lib/shareFile";
import { prewarmMap } from "../features/maps/prewarm";
import { WorkoutAwake } from "../components/WorkoutAwake";
import { observeWorkoutActivity } from "../features/tracking/liveActivity";
import { observeWatch } from "../features/watch/sync";
import { observeRecording } from "../features/tracking/lifecycle";
export { RouteError as ErrorBoundary } from "../components/RouteError";

export default function RootLayout() {
  const ready = useAppStore((s) => s.ready);
  const storageError = useAppStore((s) => s.storageError);
  const [retrying, setRetrying] = useState(false);
  const idle = useAppStore((s) => s.recording.status === "idle");
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
  useEffect(observeBackups, []);
  useEffect(observeKilometerAlerts, []);
  useEffect(observeWorkoutActivity, []);
  useEffect(observeWatch, []);
  useEffect(observeRecording, []);
  useEffect(() => {
    if (!ready) return;
    // Let the initial screen paint before preparing workers for the map tabs.
    const timer = setTimeout(prewarmMap, 250);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    try {
      cleanExports();
    } catch {
      /* Cache cleanup can retry on the next export. */
    }
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocationWatcher />
        <WorkoutAwake />
        <StatusBar style={c.bg === "#0B1120" ? "light" : "dark"} />
        {!ready ? (
          <View
            style={{
              flex: 1,
              backgroundColor: c.bg,
              justifyContent: "center",
              padding: 24,
              gap: 20,
            }}
          >
            {storageError ? (
              <>
                <Txt size={24} weight="700">
                  Kunne ikke åpne treningsloggen
                </Txt>
                <Txt>
                  De lagrede dataene er beholdt. Prøv igjen når enheten er låst
                  opp og har ledig lagringsplass.
                </Txt>
                <Button
                  title={retrying ? "Prøver igjen …" : "Prøv igjen"}
                  disabled={retrying}
                  onPress={async () => {
                    setRetrying(true);
                    try {
                      await useAppStore.persist.rehydrate();
                    } finally {
                      setRetrying(false);
                    }
                  }}
                />
              </>
            ) : (
              <ActivityIndicator
                color={c.accent}
                accessibilityLabel="Laster VYRO"
              />
            )}
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
        <LaunchSignature ready={ready} idle={idle} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
