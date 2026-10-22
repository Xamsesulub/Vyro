import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import LiveMap from "./LiveMap";
import { Button, Icon, IconName, Txt } from "./ui";
import { Recording, demoRoute } from "../features/tracking/simulator";
import { GpsFix } from "../features/tracking/gps";
import { duration, km, pace } from "../features/activities/model";
import { MapKind } from "../features/maps/config";

import { useTrackingStatus } from "../stores/useTrackingStatus";
import { brand } from "../theme/tokens";

export default function RecordingMap({
  recording: r,
  position,
  error,
  pause,
  resume,
  finish,
}: {
  recording: Recording;
  position: GpsFix | null;
  error: string | null;
  pause: () => void;
  resume: () => void;
  finish: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const narrow = width < 360 || fontScale > 1.2;
  const tracking = useTrackingStatus();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(700);
  const [panelHeight, setPanelHeight] = useState(280);
  const [expanded, setExpanded] = useState(false);
  const [follow, setFollow] = useState(true);
  const [recenter, setRecenter] = useState(0);
  const [north, setNorth] = useState(0);
  const [threeD, setThreeD] = useState(false);
  const [kind, setKind] = useState<MapKind>("standard");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const gps = r.mode === "gps";
  const paused = r.status === "paused";
  const fresh =
    gps &&
    position &&
    position.accuracy !== null &&
    position.accuracy <= 30 &&
    now - position.timestamp < 30000
      ? position
      : null;
  const overlays = useMemo(
    () =>
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
          : [],
    [r.challenge, r.guide],
  );
  const padding = useMemo(
    () => ({
      top: insets.top + 100,
      right: 68,
      left: 30,
      bottom: panelHeight + 24,
    }),
    [insets.top, panelHeight],
  );
  const simulation = useMemo(() => [demoRoute], []);
  const status = !gps
    ? "Simulering · ikke GPS"
    : error ||
      (!fresh ? "Venter på presist GPS-signal" : "GPS aktiv · privat opptak");
  function control(
    label: string,
    action: () => void,
    icon?: IconName,
    text?: string,
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={action}
        style={s.control}
      >
        {icon ? (
          <Icon name={icon} color="#11182C" size={21} />
        ) : (
          <Txt weight="700" style={{ color: "#11182C" }}>
            {text}
          </Txt>
        )}
      </Pressable>
    );
  }
  return (
    <View
      style={s.root}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      <LiveMap
        height={height}
        attributionBottom={panelHeight + 4}
        explorer
        route={gps ? r.route : simulation}
        overlays={overlays}
        position={fresh}
        follow={follow}
        recenter={recenter}
        padding={padding}
        onPan={() => setFollow(false)}
        mapKind={kind}
        threeD={threeD}
        north={north}
        contours={false}
      />
      <View style={[s.top, { top: insets.top + 12 }]}>
        {control("Minimer økten", () => router.replace("/(tabs)/map"), "back")}
        <View style={s.pill}>
          <View
            style={[
              s.dot,
              {
                backgroundColor: paused
                  ? brand.lavender
                  : fresh
                    ? brand.route
                    : brand.coral,
              },
            ]}
          />
          <Txt
            size={12}
            weight="600"
            style={{ color: "#11182C", flexShrink: 1 }}
          >
            {status}
          </Txt>
        </View>
      </View>
      {!!(r.challenge || r.guide) && (
        <View style={[s.challenge, { top: insets.top + 70 }]}>
          <Txt size={12} weight="700" style={{ color: "#4F3593" }}>
            {r.challenge
              ? `SONE · ${r.challenge.name}`
              : `RUTE · ${r.guide?.name}`}
          </Txt>
          <Txt size={11} style={{ color: "#4F3593" }}>
            Lilla: valgt løype · grønn: ditt spor
          </Txt>
        </View>
      )}
      {!expanded && (
        <View
          style={[
            s.controls,
            { top: insets.top + (r.challenge || r.guide ? 132 : 76) },
          ]}
        >
          {height - panelHeight >
            insets.top + (r.challenge || r.guide ? 350 : 294) && (
            <>
              {control(
                "Nord opp",
                () => setNorth((n) => n + 1),
                undefined,
                "N ↑",
              )}
              {control(
                kind === "standard" ? "Vis satellittkart" : "Vis standardkart",
                () => setKind(kind === "standard" ? "hybrid" : "standard"),
                "layers",
              )}
              {control(
                threeD ? "Vis i 2D" : "Vis i 3D",
                () => setThreeD(!threeD),
                undefined,
                threeD ? "2D" : "3D",
              )}
            </>
          )}
          {control(
            "Følg min posisjon",
            () => {
              setFollow(true);
              setRecenter((n) => n + 1);
            },
            "locate",
          )}
        </View>
      )}
      <View
        style={s.bottom}
        onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
      >
        <View style={s.metrics}>
          <View
            style={[
              s.metricHeader,
              { backgroundColor: paused ? "#EDE7FF" : "#11182C" },
            ]}
          >
            <Txt
              size={13}
              weight="700"
              style={{ color: paused ? "#4F3593" : "white" }}
            >
              {paused ? "Satt på pause" : r.sport}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? "Vis kompakte målinger" : "Forstørr målinger"
              }
              accessibilityState={{ expanded }}
              onPress={() => setExpanded(!expanded)}
              style={s.expand}
            >
              <Icon
                name={expanded ? "collapse" : "expand"}
                size={22}
                color={paused ? "#4F3593" : "white"}
              />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: height * 0.35 }}
            contentContainerStyle={[
              s.numbers,
              expanded && { flexDirection: "column" },
            ]}
          >
            {[
              [duration(r.seconds), "Tid"],
              [pace(r.distance, r.seconds), "Snitt /km"],
              [km(r.distance), "Distanse · km"],
            ].map(([value, label]) => (
              <View key={label} style={s.metric}>
                <Txt
                  size={expanded ? 36 : 26}
                  weight="700"
                  style={{
                    color: "#11182C",
                    fontVariant: ["tabular-nums"],
                    letterSpacing: -0.7,
                  }}
                >
                  {value}
                </Txt>
                <Txt size={11} style={{ color: "#596579" }}>
                  {label}
                </Txt>
              </View>
            ))}
          </ScrollView>
        </View>
        <View style={[s.dock, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <View style={s.handle} />
          {paused ? (
            <View style={[s.actions, narrow && { flexDirection: "column" }]}>
              <View style={!narrow && { flex: 1 }}>
                <Button
                  title={tracking.starting ? "Starter …" : "Fortsett"}
                  disabled={tracking.starting}
                  icon="play"
                  large
                  onPress={resume}
                />
              </View>
              <View style={!narrow && { flex: 1 }}>
                <Button
                  title="Fullfør"
                  icon="check"
                  secondary
                  large
                  onPress={finish}
                />
              </View>
            </View>
          ) : r.status === "finishing" ? (
            <Button
              title="Se oppsummering"
              large
              onPress={() => router.push("/summary")}
            />
          ) : (
            <Button title="Pause" icon="pause" large onPress={pause} />
          )}
          <Txt size={10} style={{ textAlign: "center", color: "#596579" }}>
            {gps
              ? tracking.backgroundActive
                ? "GPS-opptak fortsetter med låst skjerm"
                : "Hold appen åpen · opptaket pauser i bakgrunnen"
              : "Eksempelfart og illustrert rute · lagres aldri som GPS"}
          </Txt>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E5EDE4" },
  top: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pill: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    boxShadow: "0 3px 14px #11182C18",
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 3px 12px #11182C20",
  },
  controls: { position: "absolute", right: 16, gap: 8 },
  challenge: {
    position: "absolute",
    left: 16,
    right: 72,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F1EDFC",
    gap: 3,
  },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 16 },
  metrics: {
    marginHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 4px 20px #11182C24",
  },
  metricHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 18,
  },
  expand: {
    minHeight: 44,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  numbers: {
    flexDirection: "row",
    paddingVertical: 18,
    paddingHorizontal: 8,
    gap: 10,
  },
  metric: { flex: 1, alignItems: "center", gap: 4 },
  dock: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "white",
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: "#D9DED5",
    marginBottom: 4,
  },
  actions: { flexDirection: "row", gap: 12 },
});
