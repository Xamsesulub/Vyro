import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Chip,
  Screen,
  Txt,
  styles,
  useTheme,
} from "../../components/ui";
import WorkoutMap from "../../components/WorkoutMap";
import { useAppStore } from "../../stores/useAppStore";
import { duration, km, pace, sports } from "../../features/activities/model";

export default function Track() {
  const r = useAppStore((s) => s.recording);
  const event = useAppStore((s) => s.event);
  const setSport = useAppStore((s) => s.sport);
  const [showMap, setShowMap] = useState(false);
  const [chooseSport, setChooseSport] = useState(false);
  const c = useTheme();
  const status = {
    idle: "Klar til start",
    recording: "Økt pågår",
    paused: "Økten er pauset",
    finishing: "Økten er avsluttet",
  }[r.status];
  const numbers = {
    fontVariant: ["tabular-nums"] as "tabular-nums"[],
    letterSpacing: -1,
  };
  const primary = {
    idle: {
      title: "Start simulering",
      icon: "play" as const,
      action: () => event("start"),
    },
    recording: {
      title: "Pause",
      icon: "pause" as const,
      action: () => event("pause"),
    },
    paused: {
      title: "Fortsett",
      icon: "play" as const,
      action: () => event("resume"),
    },
    finishing: {
      title: "Se oppsummering",
      icon: "arrow" as const,
      action: () => router.push("/summary"),
    },
  }[r.status];
  return (
    <Screen
      footer={
        <>
          {r.status === "paused" ? (
            <Button
              title="Avslutt økten"
              secondary
              onPress={() => {
                event("finish");
                router.push("/summary");
              }}
            />
          ) : (
            <View style={{ minHeight: 54, justifyContent: "center" }}>
              <Txt size={14} muted style={{ textAlign: "center" }}>
                {status}
              </Txt>
            </View>
          )}
          <Button
            title={primary.title}
            icon={primary.icon}
            large
            onPress={primary.action}
          />
        </>
      }
    >
      <View style={styles.row}>
        <Txt size={24} weight="700">
          {r.sport}
        </Txt>
        <Txt size={12} muted>
          Simulering · ingen GPS
        </Txt>
      </View>
      {r.status === "idle" && (
        <View style={{ gap: 16 }}>
          <Button
            title="Registrer ekte GPS-løpetur"
            onPress={() => router.push("/record-gps")}
          />
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            <WorkoutMap height={280} />
          </View>
          <Txt size={12} muted>
            Eksempelkart · ingen posisjon samles inn
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: chooseSport }}
            onPress={() => setChooseSport(!chooseSport)}
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderColor: c.border,
            }}
          >
            <Txt>Aktivitet</Txt>
            <Txt weight="600">{r.sport} · Endre</Txt>
          </Pressable>
          <Txt size={14} muted>
            Prøv en økt med eksempelfart. Du kan pause og avslutte når du vil.
          </Txt>
        </View>
      )}
      {r.status === "idle" && chooseSport && (
        <View style={styles.wrap}>
          {sports.map((sport) => (
            <Chip
              key={sport}
              title={sport}
              selected={r.sport === sport}
              onPress={() => {
                setSport(sport);
                setChooseSport(false);
              }}
            />
          ))}
        </View>
      )}
      {r.status !== "idle" && (
        <View style={{ gap: 20 }}>
          <View style={{ alignItems: "center" }}>
            <Txt size={14} muted>
              Distanse · km
            </Txt>
            <Txt size={76} weight="700" style={numbers}>
              {km(r.distance)}
            </Txt>
          </View>
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: c.border,
              paddingVertical: 20,
            }}
          >
            <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <Txt size={14} muted>
                Aktiv tid
              </Txt>
              <Txt size={36} weight="700" style={numbers}>
                {duration(r.seconds)}
              </Txt>
            </View>
            <View style={{ width: 1, backgroundColor: c.border }} />
            <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <Txt size={14} muted>
                Snittempo · min/km
              </Txt>
              <Txt size={36} weight="700" style={numbers}>
                {pace(r.distance, r.seconds)}
              </Txt>
            </View>
          </View>
        </View>
      )}
      {r.status !== "idle" && (
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showMap }}
            onPress={() => setShowMap(!showMap)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Txt size={14} style={{ color: c.accent }}>
              {showMap ? "Skjul eksempelkart" : "Vis eksempelkart"}
            </Txt>
          </Pressable>
          {showMap && (
            <View style={{ borderRadius: 16, overflow: "hidden" }}>
              <WorkoutMap height={160} />
            </View>
          )}
          <Txt size={12} muted>
            Fast eksempelfart og illustrert rute. Pauses når appen går i
            bakgrunnen.
          </Txt>
        </View>
      )}
    </Screen>
  );
}
