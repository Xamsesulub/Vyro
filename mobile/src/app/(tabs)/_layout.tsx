import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName, useTheme } from "../../components/ui";
import { useAppStore } from "../../stores/useAppStore";
const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Hjem", icon: "home" },
  { name: "map", title: "Kart", icon: "map" },
  { name: "track", title: "Registrer", icon: "record" },
  { name: "community", title: "Løpere", icon: "people" },
  { name: "profile", title: "Du", icon: "user" },
];
export default function TabLayout() {
  const c = useTheme();
  const recording = useAppStore((s) => s.recording.status !== "idle");
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          paddingTop: 8,
          height: 64 + Math.max(insets.bottom, 12),
          paddingBottom: Math.max(insets.bottom, 12),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            ...(t.name === "track" && recording
              ? { tabBarStyle: { display: "none" as const } }
              : {}),
            title: t.title,
            tabBarIcon: ({ focused }) => (
              <Icon
                name={t.icon}
                color={focused ? c.accent : c.muted}
                size={23}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
