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
import RecordingMap from "../../components/RecordingMap";
import LiveMap from "../../components/LiveMap";
import WorkoutMap from "../../components/WorkoutMap";
import { useAppStore } from "../../stores/useAppStore";
import { useLiveLocation } from "../../features/tracking/useLiveLocation";
import { RecordingMode } from "../../features/tracking/simulator";
import { sports } from "../../features/activities/model";
import { brand } from "../../theme/tokens";
import { useAuthStore } from "../../stores/useAuthStore";

const modes: { mode: RecordingMode; title: string }[] = [
  { mode: "gps", title: "GPS" },
  { mode: "simulation", title: "Simulering" },
];
export default function Track() {
  const r = useAppStore((s) => s.recording);
  const userId = useAuthStore((s) => s.session?.user.id);
  const event = useAppStore((s) => s.event);
  const setSport = useAppStore((s) => s.sport);
  const setMode = useAppStore((s) => s.mode);
  const gps = r.mode === "gps";
  const loc = useLiveLocation(gps);
  const [denied, setDenied] = useState(false);

  const [chooseSport, setChooseSport] = useState(false);
  const c = useTheme();
  const status = {
    idle: "Klar til start",
    recording: "Økt pågår",
    paused: "Økten er pauset",
    finishing: "Økten er avsluttet",
  }[r.status];
  const primary = {
    idle: {
      title: gps ? "Start" : "Start simulering",
      icon: "play" as const,
      action: async () => {
        if (gps && !userId) {
          router.push("/account");
          return;
        }
        if (gps && loc.permission !== "granted" && !(await loc.request())) {
          setDenied(true);
          return;
        }
        setDenied(false);
        event("start");
      },
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
  if (r.ownerId && r.ownerId !== userId)
    return (
      <Screen>
        <Txt>En privat økt tilhører en annen konto på enheten.</Txt>
        <Button
          title="Bytt konto for å fortsette"
          onPress={() => router.push("/account")}
        />
      </Screen>
    );
  if (r.status !== "idle")
    return (
      <RecordingMap
        recording={r}
        position={loc.position}
        error={loc.error}
        pause={() => event("pause")}
        resume={() => event("resume")}
        finish={() => {
          event("finish");
          router.push("/summary");
        }}
      />
    );
  return (
    <Screen
      footer={
        <>
          <Txt size={14} muted style={{ textAlign: "center" }}>
            {status}
          </Txt>
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
          {gps ? "GPS · live posisjon" : "Simulering · ingen GPS"}
        </Txt>
      </View>
      {r.status === "idle" && (
        <View style={{ gap: 16 }}>
          <View style={styles.wrap}>
            {modes.map((m) => (
              <Chip
                key={m.mode}
                title={m.title}
                selected={r.mode === m.mode}
                onPress={() => {
                  setMode(m.mode);
                  setDenied(false);
                }}
              />
            ))}
          </View>
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            {gps && (loc.permission === "granted" || r.challenge) ? (
              <LiveMap
                height={280}
                position={loc.position}
                follow={!r.challenge}
                overlays={
                  r.challenge
                    ? [
                        {
                          id: r.challenge.id,
                          name: r.challenge.name,
                          owner: "Sone · start",
                          points: r.challenge.route,
                          color: "#7353C6",
                        },
                      ]
                    : []
                }
              />
            ) : (
              <WorkoutMap height={280} />
            )}
          </View>
          <Txt
            size={12}
            muted={!denied}
            style={denied ? { color: brand.coral } : undefined}
          >
            {!gps
              ? "Eksempelkart · ingen posisjon samles inn"
              : denied
                ? "VYRO fikk ikke tilgang til posisjon. Slå den på i innstillingene, eller velg simulering."
                : loc.permission !== "granted"
                  ? r.challenge
                    ? "Valgt løype · trykk Start for å slå på GPS"
                    : "Eksempelkart · trykk Start for å slå på GPS"
                  : (loc.error ??
                    (loc.position
                      ? "Din posisjon · brukes bare mens appen er åpen"
                      : "Leter etter GPS-signal …"))}
          </Txt>
          {!!r.challenge && (
            <View style={{ gap: 8 }}>
              <Txt weight="700">Valgt sone: {r.challenge.name}</Txt>
              <Txt size={12} muted>
                Løypa vises i lilla. Start opptaket og følg løypa. Ingen
                svingvarsler.
              </Txt>
              <Button
                title="Fjern valgt sone"
                secondary
                onPress={() => useAppStore.getState().selectTurf()}
              />
            </View>
          )}
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
            {gps
              ? "Kartet følger deg mens du trener. Du kan pause og avslutte når du vil."
              : "Prøv en økt med eksempelfart. Du kan pause og avslutte når du vil."}
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
    </Screen>
  );
}
