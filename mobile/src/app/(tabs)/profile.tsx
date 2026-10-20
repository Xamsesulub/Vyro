import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ActivityCard } from "../../components/ActivityCard";
import { Button, Screen, Txt, styles, useTheme } from "../../components/ui";
import { examples } from "../../features/activities/examples";
import { km, total, weekWorkouts } from "../../features/activities/model";
import { useAppStore } from "../../stores/useAppStore";
import { useVisibleWorkouts } from "../../features/activities/useVisibleWorkouts";
import { useAuthStore } from "../../stores/useAuthStore";
import { ProgressLine, Reveal } from "../../components/motion";

export default function Profile() {
  const s = useAppStore();
  const workouts = useVisibleWorkouts();
  const session = useAuthStore((s) => s.session);
  const c = useTheme();
  const [tab, setTab] = useState("Fremgang");
  const list = s.examplesVisible ? [...workouts, ...examples] : workouts;
  const weekly = total(weekWorkouts(list));
  return (
    <Screen>
      <View style={styles.row}>
        <Txt size={28} weight="700">
          Du
        </Txt>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Txt size={14}>Innstillinger</Txt>
        </Pressable>
      </View>
      <Reveal>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: c.raised,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt size={26} weight="600">
              {s.name.charAt(0).toUpperCase() || "V"}
            </Txt>
          </View>
          <View style={{ gap: 4 }}>
            <Txt size={23} weight="700">
              {session?.user.user_metadata.display_name ||
                s.name ||
                "Din profil"}
            </Txt>
            <Txt muted size={13}>
              {workouts.length} lagrede aktiviteter på enheten
            </Txt>
          </View>
        </View>
      </Reveal>
      <Button
        title={session ? "Konto" : "Logg inn"}
        secondary
        onPress={() => router.push("/account")}
      />
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderColor: c.border,
        }}
      >
        {["Fremgang", "Aktiviteter", "Mer"].map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: tab === t ? 3 : 0,
              borderColor: c.accent,
            }}
          >
            <Txt size={14} weight={tab === t ? "700" : "400"}>
              {t}
            </Txt>
          </Pressable>
        ))}
      </View>
      {tab === "Fremgang" && (
        <>
          <Txt size={20} weight="700">
            Denne uken
          </Txt>
          <View style={styles.row}>
            {[
              [km(weekly.distance), "km"],
              [String(Math.round(weekly.seconds / 60)), "minutter"],
              [String(weekWorkouts(list).length), "aktiviteter"],
            ].map(([value, label]) => (
              <View key={label} style={{ gap: 4 }}>
                <Txt size={26} weight="700">
                  {value}
                </Txt>
                <Txt size={12} muted>
                  {label}
                </Txt>
              </View>
            ))}
          </View>
          <Txt muted size={12}>
            {s.examplesVisible
              ? "Inkluderer eksempeldata"
              : "Lokalt lagrede økter"}
          </Txt>
          <Button
            title="Se treningslogg"
            secondary
            onPress={() => router.push("/progress")}
          />
          <View
            style={{
              borderTopWidth: 1,
              borderColor: c.border,
              paddingTop: 24,
              gap: 12,
            }}
          >
            <Txt size={20} weight="700">
              Ukentlig mål
            </Txt>
            <Txt muted>
              {km(weekly.distance)} av {s.goal} km
            </Txt>
            <ProgressLine
              value={weekly.distance / s.goal}
              color={c.accent}
              background={c.raised}
            />
            <Txt size={13} muted>
              Endre målet i treningsloggen.
            </Txt>
          </View>
        </>
      )}
      {tab === "Aktiviteter" &&
        (list.length ? (
          list.map((w) => <ActivityCard key={w.id} workout={w} />)
        ) : (
          <Txt muted>Ingen lagrede aktiviteter ennå.</Txt>
        ))}
      {tab === "Mer" && (
        <>
          <Button
            title="Rediger profil"
            secondary
            onPress={() => router.push("/settings")}
          />
          <Txt muted size={14}>
            Aktivitetene er private og lagres på denne enheten. Konto og
            synkronisering er ikke koblet til ennå.
          </Txt>
        </>
      )}
    </Screen>
  );
}
