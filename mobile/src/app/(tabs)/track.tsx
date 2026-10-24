import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
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
import { useAppStore } from "../../stores/useAppStore";
import { useLiveLocation } from "../../features/tracking/useLiveLocation";
import { demoRoute, RecordingMode } from "../../features/tracking/simulator";
import { sports } from "../../features/activities/model";
import { brand } from "../../theme/tokens";
import { useAuthStore } from "../../stores/useAuthStore";

import { beginRecording } from "../../features/tracking/controls";
import { backgroundSupported } from "../../features/tracking/background";
import { useTrackingStatus } from "../../stores/useTrackingStatus";

const modes: { mode: RecordingMode; title: string }[] = [
  { mode: "gps", title: "GPS" },
  { mode: "simulation", title: "Simulering" },
];
const exampleRoute = [demoRoute];
export default function Track() {
  const r = useAppStore((s) => s.recording);
  const userId = useAuthStore((s) => s.session?.user.id);
  const event = useAppStore((s) => s.event);
  const setSport = useAppStore((s) => s.sport);
  const setMode = useAppStore((s) => s.mode);
  const tracking = useTrackingStatus();
  const background = useAppStore((s) => s.backgroundRecording);
  const { height } = useWindowDimensions();
  const mapHeight = Math.max(300, Math.min(520, height * 0.49));
  const [showDemo, setShowDemo] = useState(r.mode === "simulation");
  const gps = r.mode === "gps";
  const loc = useLiveLocation(gps);

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
        await beginRecording("start");
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
      action: () => {
        void beginRecording("resume");
      },
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
        <Txt>
          {r.status === "idle"
            ? "En valgt rute tilhører en annen konto på enheten."
            : "En privat økt tilhører en annen konto på enheten."}
        </Txt>
        {r.status === "idle" && (
          <Button
            title="Fjern rutevalget"
            secondary
            onPress={() => event("discard")}
          />
        )}
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
        error={tracking.error ?? loc.error}
        pause={() => event("pause")}
        resume={() => {
          void beginRecording("resume");
        }}
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
            {tracking.starting ? "Klargjør opptak …" : status}
          </Txt>
          {!!tracking.error && (
            <View
              accessibilityRole="alert"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: brand.coral,
                paddingLeft: 10,
              }}
            >
              <Txt size={14}>{tracking.error}</Txt>
            </View>
          )}
          <Button
            title={tracking.starting ? "Starter …" : primary.title}
            disabled={tracking.starting}
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
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showDemo }}
            onPress={() => setShowDemo(!showDemo)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Txt size={14} muted>
              {gps ? "Prøv uten GPS" : "Simulering er valgt · endre"}
            </Txt>
          </Pressable>
          {showDemo && (
            <View style={styles.wrap}>
              {modes.map((m) => (
                <Chip
                  key={m.mode}
                  title={m.title}
                  selected={r.mode === m.mode}
                  onPress={() => {
                    setMode(m.mode);
                    useTrackingStatus.setState({ error: null });
                  }}
                />
              ))}
            </View>
          )}
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            <LiveMap
              height={mapHeight}
              position={gps ? loc.position : null}
              follow={gps && !r.challenge && !r.guide}
              route={
                !gps || (!loc.position && !r.challenge && !r.guide)
                  ? exampleRoute
                  : undefined
              }
              overlays={
                r.challenge
                  ? [
                      {
                        id: r.challenge.id,
                        name: r.challenge.name,
                        owner: "Sone · start",
                        points: r.challenge.route,
                        color: brand.competition,
                      },
                    ]
                  : r.guide
                    ? [
                        {
                          id: "guide",
                          name: r.guide.name,
                          owner: "Din tidligere rute",
                          points: r.guide.route,
                          color: brand.competition,
                        },
                      ]
                    : []
              }
            />
          </View>
          <Txt size={12} muted>
            {!gps
              ? "Simulering"
              : loc.permission !== "granted"
                ? r.challenge
                  ? "Valgt løype"
                  : "Eksempelkart"
                : (tracking.error ??
                  loc.error ??
                  (loc.position
                    ? background && backgroundSupported
                      ? "GPS · bakgrunnsopptak"
                      : "GPS"
                    : "Leter etter GPS-signal …"))}
          </Txt>
          {!!r.guide && (
            <View style={{ gap: 8 }}>
              <Txt weight="700">Følg ruten: {r.guide.name}</Txt>
              <Txt muted size={12}>
                Lilla viser den gamle ruten. Grønt viser ditt nye spor. Ingen
                svingvarsler.
              </Txt>
              <Button
                title="Fjern rute"
                secondary
                onPress={() =>
                  useAppStore.setState({
                    recording: { ...r, guide: undefined, ownerId: undefined },
                  })
                }
              />
            </View>
          )}
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
