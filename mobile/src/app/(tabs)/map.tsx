import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Txt, Icon } from "../../components/ui";
import { MapRouteSheet } from "../../components/MapRouteSheet";
import { MapSearch } from "../../components/MapSearch";
import LiveMap from "../../components/LiveMap";
import { useAppStore } from "../../stores/useAppStore";
import { useLiveLocation } from "../../features/tracking/useLiveLocation";
import { duration, km } from "../../features/activities/model";
import { useSavedRoutes } from "../../stores/useSavedRoutes";
import type { Place } from "../../features/maps/search";
import type { MapKind } from "../../features/maps/config";
import { useVisibleWorkouts } from "../../features/activities/useVisibleWorkouts";
import { brand, palettes } from "../../theme/tokens";

// Map panels stay light even when the surrounding app uses the dark theme.
function MapText({ style, muted, ...props }: ComponentProps<typeof Txt>) {
  return (
    <Txt
      {...props}
      muted={muted}
      style={{
        color: muted ? palettes.light.muted : palettes.light.text,
        ...style,
      }}
    />
  );
}

export default function Maps() {
  const saved = useSavedRoutes();
  const workouts = useVisibleWorkouts();
  const [length, setLength] = useState(0);
  const [sheet, setSheet] = useState<"layers" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  useFocusEffect(useCallback(() => () => setSearchOpen(false), []));
  const mapKind = useAppStore((s) => s.defaultMapKind ?? "standard");
  const setMapKind = (defaultMapKind: MapKind) =>
    useAppStore.getState().preferences({ defaultMapKind });
  const [poi, setPoi] = useState(true);
  const [contours, setContours] = useState(false);
  const [threeD, setThreeD] = useState(false);
  const [north, setNorth] = useState(0);
  const [target, setTarget] = useState<Place | null>(null);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [panelHeight, setPanelHeight] = useState(300);
  const [height, setHeight] = useState(700);
  const [follow, setFollow] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const loc = useLiveLocation(true);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const position =
    loc.permission === "granted" &&
    loc.position &&
    now - loc.position.timestamp < 30000
      ? loc.position
      : null;
  const insets = useSafeAreaInsets();
  const turfs = useMemo(() => {
    const own = workouts
      .filter((w) => w.source === "gps" && w.route?.length)
      .map((w) => ({
        id: w.id,
        name: w.title,
        ownerId: "self",
        seconds: w.seconds,
        distance: w.distance,
        points: w.route!,
        color: brand.route,
      }));
    return own.filter(
      (t) =>
        !length ||
        (length === 1
          ? t.distance < 3
          : length === 2
            ? t.distance >= 3 && t.distance <= 10
            : t.distance > 10),
    );
  }, [workouts, length]);
  const turf = turfs[index % Math.max(1, turfs.length)];
  const owner = { name: "Deg", initials: "DU" };
  const routes = useMemo(
    () =>
      turf
        ? [
            {
              id: turf.id,
              name: turf.name,
              owner: owner?.name ?? "",
              points: turf.points,
              color: brand.route,
            },
          ]
        : [],
    [turf, owner?.name],
  );
  const padding = useMemo(
    () => ({
      top: 150 + insets.top,
      right: 68,
      bottom: panelHeight + 52,
      left: 35,
    }),
    [panelHeight, insets.top],
  );
  return (
    <View
      style={{ flex: 1, backgroundColor: "#E5EDE4", overflow: "hidden" }}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      <LiveMap
        height={height}
        attributionBottom={panelHeight + 12}
        overlays={routes}
        position={position}
        follow={follow}
        recenter={recenter}
        padding={padding}
        onPan={() => {
          setFollow(false);
          setSearchOpen(false);
        }}
        mapKind={mapKind}
        poi={poi}
        contours={contours}
        threeD={threeD}
        north={north}
        target={target}
        explorer
      />
      <View
        style={[
          s.controls,
          searchOpen && { display: "none" },
          { top: insets.top + 145 },
          height - panelHeight - 36 < insets.top + 435 && {
            flexDirection: "row",
            gap: 8,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nord opp"
          onPress={() => setNorth((v) => v + 1)}
          style={s.control}
        >
          <MapText weight="700">N ↑</MapText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kartlag"
          onPress={() => setSheet("layers")}
          style={s.control}
        >
          <Icon name="layers" size={24} color="#11182C" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={threeD ? "Vis i 2D" : "Vis i 3D"}
          onPress={() => setThreeD(!threeD)}
          style={s.control}
        >
          <MapText weight="700">{threeD ? "2D" : "3D"}</MapText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vis hele ruten"
          onPress={() => {
            setFollow(false);
            setTarget(null);
            setRecenter((v) => v + 1);
            setMessage("");
          }}
          style={s.control}
        >
          <Icon name="map" size={22} color="#11182C" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vis min posisjon"
          disabled={locating}
          onPress={async () => {
            setLocating(true);
            try {
              if (await loc.request()) {
                setTarget(null);
                setFollow(true);
                setRecenter((v) => v + 1);
                setMessage("");
              } else
                setMessage(
                  "Gi tilgang til posisjon for å finne deg på kartet.",
                );
            } finally {
              setLocating(false);
            }
          }}
          style={[s.control, follow && { backgroundColor: "#EAF5DF" }]}
        >
          <Icon
            name="locate"
            color={follow ? "#1689F8" : "#11182C"}
            size={22}
          />
        </Pressable>
      </View>
      <View style={[s.bottom, searchOpen && { display: "none" }]}>
        {!!(message || loc.error || (follow && !position)) && (
          <View style={s.notice}>
            <MapText size={13}>
              {message || loc.error || "Finner posisjonen din …"}
            </MapText>
          </View>
        )}
        <MapRouteSheet
          maxHeight={Math.max(100, Math.min(420, height - insets.top - 230))}
          onHeightChange={setPanelHeight}
        >
          <View style={s.card}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={s.tag}>
                <View style={s.dot} />
                <MapText size={11} weight="700">
                  {turf ? "DIN LAGREDE GPS-RUTE" : "RUTER"}
                </MapText>
              </View>
              {!!turf && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    saved.ids.includes(turf.id)
                      ? "Fjern lagret rute"
                      : "Lagre ruten"
                  }
                  onPress={() => saved.toggle(turf.id)}
                  style={{ padding: 12, marginLeft: "auto" }}
                >
                  <MapText size={20}>
                    {saved.ids.includes(turf.id) ? "★" : "☆"}
                  </MapText>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  expanded ? "Skjul detaljer" : "Vis detaljer"
                }
                onPress={() => setExpanded(!expanded)}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapText size={20}>{expanded ? "−" : "+"}</MapText>
              </Pressable>
            </View>
            <MapText size={21} weight="700">
              {turf?.name ?? "Ingen ruter å vise"}
            </MapText>
            {turf ? (
              <>
                <View style={s.metrics}>
                  <MapText weight="700">{km(turf.distance)} km</MapText>
                  <MapText muted>·</MapText>
                  <MapText weight="600">
                    {duration(turf.seconds)}
                    {" totalt"}
                  </MapText>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={s.avatar}>
                    <MapText size={11} weight="700">
                      {owner?.initials}
                    </MapText>
                  </View>
                  <MapText size={13} muted>
                    Din private GPS-rute
                  </MapText>
                  {turfs.length > 1 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Neste turf"
                      onPress={() => {
                        setIndex((v) => v + 1);
                        setFollow(false);
                        setTarget(null);
                      }}
                      style={{ marginLeft: "auto", padding: 10 }}
                    >
                      <MapText size={13} weight="600">
                        Neste →
                      </MapText>
                    </Pressable>
                  )}
                </View>
              </>
            ) : (
              <MapText muted size={14}>
                Ingen ruter passer filteret. Finn en ny løype under Ruteforslag,
                eller lagre din egen GPS-økt.
              </MapText>
            )}
            {expanded && (
              <MapText muted size={13}>
                Dette panelet viser dine private GPS-ruter. Åpne Soner for
                konkurranseløyper. Slå hele løypa og velg om du vil utvide den
                med resten av turen.
              </MapText>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start en økt"
              onPress={() => router.push("/(tabs)/track")}
              style={s.start}
            >
              <Icon name="record" size={20} color="#11182C" />
              <MapText weight="700">Start en økt</MapText>
            </Pressable>
          </View>
        </MapRouteSheet>
      </View>
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={searchOpen}
        style={[s.top, { paddingTop: insets.top + 16 }]}
      >
        <View pointerEvents="box-none" style={{ flex: 1, paddingBottom: 12 }}>
          <MapSearch
            active={searchOpen}
            onActiveChange={setSearchOpen}
            savedOnly={false}
            onToggleSaved={() =>
              router.push({ pathname: "/routes", params: { tab: "saved" } })
            }
            onSelect={(place) => {
              setTarget(place);
              setFollow(false);
              setMessage("");
            }}
          />
          {!searchOpen && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10, flexGrow: 0, flexShrink: 0 }}
              contentContainerStyle={{ gap: 8 }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Åpne ekte soner"
                onPress={() => router.push("/turf")}
                style={s.chip}
              >
                <MapText size={13} weight="700">
                  Soner ↗
                </MapText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finn ruteforslag"
                style={s.chip}
                onPress={() => {
                  const area = target ?? position;
                  router.push({
                    pathname: "/routes",
                    params: area
                      ? {
                          lat: String(area.latitude),
                          lon: String(area.longitude),
                          name: target?.name ?? "Nær meg",
                        }
                      : {},
                  });
                }}
              >
                <MapText size={13} weight="700">
                  Ruteforslag ↗
                </MapText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filtrer på lengde"
                onPress={() => {
                  setLength((v) => (v + 1) % 4);
                  setIndex(0);
                }}
                style={s.chip}
              >
                <MapText size={13} weight="600">
                  {["Lengde", "Under 3 km", "3–10 km", "Over 10 km"][length]}
                </MapText>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#11182C55",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lukk kartpanel"
            style={{ flex: 1 }}
            onPress={() => setSheet(null)}
          />
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 24 + insets.bottom,
              maxHeight: "75%",
              gap: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <MapText weight="700" size={22}>
                Karttyper og lag
              </MapText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lukk"
                onPress={() => setSheet(null)}
                style={{ padding: 12 }}
              >
                <MapText size={23}>×</MapText>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(
                  [
                    ["standard", "Standard"],
                    ["satellite", "Satellitt"],
                    ["hybrid", "Hybrid"],
                  ] as const
                ).map(([kind, title]) => (
                  <Pressable
                    key={kind}
                    accessibilityRole="button"
                    accessibilityState={{ selected: kind === mapKind }}
                    onPress={() => setMapKind(kind)}
                    style={{
                      flex: 1,
                      borderWidth: 2,
                      borderColor: mapKind === kind ? brand.route : "#E7E9E5",
                      borderRadius: 14,
                      padding: 12,
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        height: 48,
                        width: "100%",
                        borderRadius: 8,
                        backgroundColor:
                          kind === "standard"
                            ? "#C4DDA9"
                            : kind === "satellite"
                              ? "#224C38"
                              : "#5C7050",
                      }}
                    />
                    <MapText size={12} weight="600">
                      {title}
                    </MapText>
                  </Pressable>
                ))}
              </View>
              <MapText size={13} muted>
                {mapKind === "satellite"
                  ? "Fly- og satellittbilder uten kartnavn."
                  : mapKind === "hybrid"
                    ? "Satellittbilder med veier og kartnavn."
                    : "Veikart med stier og kartnavn."}
              </MapText>
              {(
                [
                  [
                    Platform.OS === "ios"
                      ? "Interessepunkter"
                      : "Stedsnavn og interessepunkter",
                    poi,
                    setPoi,
                  ],
                  ["Høydekurver", contours, setContours],
                  [
                    Platform.OS === "ios" ? "3D-visning" : "3D-terreng",
                    threeD,
                    setThreeD,
                  ],
                ] as const
              )
                .filter(
                  ([label]) => Platform.OS !== "ios" || label !== "Høydekurver",
                )
                .map(([label, value, set]) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      minHeight: 48,
                    }}
                  >
                    <MapText size={15}>{label}</MapText>
                    <Switch
                      accessibilityLabel={label}
                      disabled={set === setPoi && mapKind === "satellite"}
                      value={
                        set === setPoi && mapKind === "satellite"
                          ? false
                          : value
                      }
                      onValueChange={set}
                    />
                  </View>
                ))}
              <MapText muted size={13}>
                Varmekart er ikke tilgjengelig ennå. Det krever ekte
                aktivitetsdata.
              </MapText>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  top: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 16,
    right: 16,
    maxWidth: 460,
  },
  chip: {
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
    boxShadow: "0 2px 8px #11182C14",
  },
  controls: { position: "absolute", right: 16, gap: 10 },
  control: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 2px 12px #11182C25",
  },
  bottom: {
    position: "absolute",
    bottom: 36,
    left: 16,
    right: 16,
    maxWidth: 460,
    gap: 8,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    gap: 8,
  },
  tag: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: brand.route },
  metrics: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EDF3E7",
    alignItems: "center",
    justifyContent: "center",
  },
  start: {
    backgroundColor: "#B2FF78",
    borderRadius: 12,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  notice: { backgroundColor: "white", padding: 12, borderRadius: 12 },
});
