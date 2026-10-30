import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandWordmark } from "../../components/Brand";
import { Avatar, IconButton } from "../../components/SocialUi";
import { Button, Txt, Icon, useTheme } from "../../components/ui";
import { MapSearch } from "../../components/MapSearch";
import { loadClubPage, type Club } from "../clubs/api";
import type { MapPoint } from "../maps/config";
import { km, duration } from "../activities/model";
import { ClubPicker } from "./ClubPicker";
import {
  loadClubContext,
  loadClubScores,
  loadClubTurfs,
  type ClubScore,
  type ClubTurf,
  type ClubTurfCursor,
} from "./clubApi";
import { turfError } from "./api";
import { ownerColor } from "./zoneGeometry";
import ClubZoneMap from "./ClubZoneMap";

export function ClubZones({
  userId,
  initialClubId,
}: {
  userId: string;
  initialClubId?: string;
}) {
  const c = useTheme(),
    insets = useSafeAreaInsets();
  const [club, setClub] = useState<Club | null>(null);
  const chosen = useRef(initialClubId);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      void retry;
      const abort = new AbortController();
      setBusy(true);
      setError("");
      void (
        chosen.current
          ? loadClubContext(chosen.current, userId, abort.signal)
          : loadClubPage("mine", undefined, abort.signal).then(
              (p) => p.items[0] ?? null,
            )
      )
        .then((value) => {
          if (!abort.signal.aborted) {
            setClub(value);
            chosen.current = value?.id;
          }
        })
        .catch((e) => {
          if (!abort.signal.aborted) {
            setClub(null);
            setError(turfError(e));
          }
        })
        .finally(() => {
          if (!abort.signal.aborted) setBusy(false);
        });
      return () => abort.abort();
    }, [userId, retry]),
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            height: 52,
          }}
        >
          <IconButton
            name="back"
            label="Til dine ruter"
            onPress={() =>
              router.setParams({ view: "routes", clubId: undefined })
            }
          />
          <BrandWordmark width={124} color={c.text} />
          <IconButton
            name="plus"
            label="Legg ut sone"
            disabled={!club || busy}
            onPress={() =>
              router.push({
                pathname: "/turf",
                params: { mode: "new", clubId: club!.id },
              })
            }
          />
        </View>
        <ClubPicker
          selected={club}
          onSelect={(value) => {
            chosen.current = value.id;
            setClub(value);
            setError("");
          }}
        />
      </View>
      {busy ? (
        <ActivityIndicator
          accessibilityLabel="Henter klubben"
          style={{ padding: 30 }}
        />
      ) : club ? (
        <ClubZonePanel
          key={`${userId}:${club.id}`}
          club={club}
          userId={userId}
        />
      ) : (
        <View style={{ padding: 24, gap: 16 }}>
          <Txt size={24} weight="700">
            Klubbens soner starter her
          </Txt>
          <Txt muted>
            {error ||
              "Bli med i en klubb, del en løpetur og utfordre hverandres tider."}
          </Txt>
          {!!error && (
            <Button
              title="Prøv igjen"
              secondary
              onPress={() => setRetry((n) => n + 1)}
            />
          )}
          <Button
            title="Finn en klubb"
            onPress={() => router.push("/(tabs)/community")}
          />
        </View>
      )}
    </View>
  );
}

function ClubZonePanel({ club, userId }: { club: Club; userId: string }) {
  const c = useTheme();
  const compact = useWindowDimensions().width < 360;
  const [tab, setTab] = useState<"map" | "results">("map");
  const [zones, setZones] = useState<ClubTurf[]>([]),
    [scores, setScores] = useState<ClubScore[]>([]);
  const [next, setNext] = useState<ClubTurfCursor | null>(null),
    [moreScores, setMoreScores] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(true),
    [paging, setPaging] = useState(false),
    [error, setError] = useState("");
  const [reload, setReload] = useState(0),
    [satellite, setSatellite] = useState(false),
    [recenter, setRecenter] = useState(0);
  const [search, setSearch] = useState(false),
    [target, setTarget] = useState<MapPoint | null>(null);
  const request = useRef<AbortController | null>(null),
    pageLock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      void reload;
      const abort = new AbortController();
      request.current = abort;
      pageLock.current = false;
      setBusy(true);
      setPaging(false);
      setError("");
      setSearch(false);
      void Promise.all([
        loadClubTurfs(club.id, abort.signal),
        loadClubScores(club.id, abort.signal),
      ])
        .then(([map, results]) => {
          if (abort.signal.aborted) return;
          setZones(map.items);
          setNext(map.next);
          setScores(results.items);
          setMoreScores(results.more);
          setSelected((old) =>
            map.items.some((t) => t.id === old)
              ? old
              : (map.items[0]?.id ?? ""),
          );
        })
        .catch((e) => {
          if (!abort.signal.aborted) {
            setZones([]);
            setScores([]);
            setNext(null);
            setMoreScores(false);
            setError(turfError(e));
          }
        })
        .finally(() => {
          if (!abort.signal.aborted) setBusy(false);
        });
      return () => abort.abort();
    }, [club.id, reload]),
  );
  const zone = zones.find((t) => t.id === selected) ?? zones[0];
  async function loadMore() {
    const abort = request.current;
    if (!abort || abort.signal.aborted || pageLock.current) return;
    pageLock.current = true;
    setPaging(true);
    setError("");
    try {
      if (tab === "map" && next) {
        const page = await loadClubTurfs(club.id, abort.signal, next);
        if (!abort.signal.aborted) {
          setZones((old) => [
            ...new Map([...old, ...page.items].map((t) => [t.id, t])).values(),
          ]);
          setNext(page.next);
        }
      } else if (tab === "results") {
        const page = await loadClubScores(club.id, abort.signal, scores.length);
        if (!abort.signal.aborted) {
          setScores((old) => [
            ...new Map(
              [...old, ...page.items].map((s) => [s.user_id, s]),
            ).values(),
          ]);
          setMoreScores(page.more);
        }
      }
    } catch (e) {
      if (!abort.signal.aborted) setError(turfError(e));
    } finally {
      if (!abort.signal.aborted) {
        pageLock.current = false;
        setPaging(false);
      }
    }
  }
  const newZone = () =>
    router.push({
      pathname: "/turf",
      params: { mode: "new", clubId: club.id },
    });
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 10,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
        }}
      >
        <View
          accessibilityRole="tablist"
          style={{
            flex: 1,
            flexDirection: "row",
            backgroundColor: c.raised,
            padding: 4,
            borderRadius: 18,
          }}
        >
          {(
            [
              ["map", "Soner"],
              ["results", "Resultater"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === value }}
              onPress={() => setTab(value)}
              style={{
                flex: 1,
                minHeight: 43,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                backgroundColor: tab === value ? "#11182C" : "transparent",
              }}
            >
              <Txt
                weight="700"
                style={{ color: tab === value ? "#B4FF68" : c.muted }}
              >
                {label}
              </Txt>
            </Pressable>
          ))}
        </View>
        <IconButton
          name="refresh"
          label="Oppdater klubbens soner"
          disabled={busy || paging}
          onPress={() => setReload((n) => n + 1)}
        />
      </View>
      {busy ? (
        <ActivityIndicator
          accessibilityLabel="Henter klubbens soner"
          style={{ padding: 32 }}
        />
      ) : (
        <>
          {!!error && (
            <View style={{ padding: 16, gap: 10 }}>
              <Txt accessibilityRole="alert">{error}</Txt>
              <Button
                title="Prøv igjen"
                secondary
                onPress={() => setReload((n) => n + 1)}
              />
            </View>
          )}
          {tab === "map" ? (
            <View style={{ flex: 1, minHeight: 240, overflow: "hidden" }}>
              <ClubZoneMap
                turfs={zones}
                selected={zone?.id}
                onSelect={setSelected}
                satellite={satellite}
                recenter={recenter}
                target={target}
              />
              <View
                style={{ position: "absolute", right: 16, top: 16, gap: 10 }}
              >
                <IconButton
                  name="search"
                  label="Søk etter sted"
                  variant="elevated"
                  onPress={() => setSearch((v) => !v)}
                />
                <IconButton
                  name="layers"
                  label={satellite ? "Vis standardkart" : "Vis satellittkart"}
                  variant="elevated"
                  onPress={() => setSatellite((v) => !v)}
                />
                <IconButton
                  name="locate"
                  label="Vis alle klubbens soner"
                  variant="elevated"
                  disabled={!zones.length}
                  onPress={() => {
                    setTarget(null);
                    setRecenter((n) => n + 1);
                  }}
                />
              </View>
              {search && (
                <View
                  style={{ position: "absolute", top: 14, left: 14, right: 74 }}
                >
                  <MapSearch
                    active={search}
                    onActiveChange={setSearch}
                    savedOnly={false}
                    onToggleSaved={() => {
                      setSearch(false);
                      router.push("/saved-routes");
                    }}
                    onSelect={(place) => {
                      setTarget(place);
                      setSearch(false);
                    }}
                  />
                </View>
              )}
              {next && !search && (
                <View style={{ position: "absolute", top: 14, left: 14 }}>
                  <Button
                    secondary
                    title={paging ? "Henter …" : "Vis flere soner"}
                    disabled={paging}
                    onPress={loadMore}
                  />
                </View>
              )}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: c.surface,
                  borderTopLeftRadius: 26,
                  borderTopRightRadius: 26,
                  padding: 18,
                  gap: 14,
                  boxShadow: "0 -3px 24px #11182C10",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: c.border,
                    alignSelf: "center",
                  }}
                />
                {zone ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: compact ? "wrap" : "nowrap",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        borderRadius: 40,
                        borderColor: ownerColor(zone.owner_id),
                        borderWidth: 3,
                        padding: 3,
                      }}
                    >
                      <Avatar
                        name={zone.profiles?.display_name ?? "Medlem"}
                        path={zone.profiles?.avatar_path}
                        size={44}
                      />
                    </View>
                    <View
                      style={{ flex: 1, minWidth: compact ? 170 : 0, gap: 3 }}
                    >
                      <Txt size={19} weight="700" numberOfLines={2}>
                        {zone.name}
                      </Txt>
                      <Txt size={14} muted numberOfLines={1}>
                        {zone.owner_id === userId
                          ? "Eies av deg"
                          : `Eies av ${zone.profiles?.display_name ?? "medlem"}`}
                      </Txt>
                      <Txt size={12} muted>
                        {km(zone.distance_m / 1000)} km ·{" "}
                        {duration(zone.seconds)} å slå
                      </Txt>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Se sonen"
                      onPress={() =>
                        router.push({
                          pathname: "/turf",
                          params: { turfId: zone.id },
                        })
                      }
                      style={{
                        minHeight: 48,
                        width: compact ? "100%" : undefined,
                        backgroundColor: "#B4FF68",
                        borderRadius: 24,
                        paddingHorizontal: 16,
                        justifyContent: "center",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Txt weight="700" size={14} style={{ color: "#11182C" }}>
                        Se sonen
                      </Txt>
                      <Icon name="chevronRight" size={16} color="#11182C" />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Txt size={22} weight="700">
                      Den første sonen er deres
                    </Txt>
                    <Txt muted size={14}>
                      Del en lagret løpetur med {club.name}. Bare medlemmer kan
                      se og utfordre sonen.
                    </Txt>
                    <Button title="Legg ut første sone" onPress={newZone} />
                  </>
                )}
              </View>
            </View>
          ) : (
            <FlatList
              data={scores}
              keyExtractor={(s) => s.user_id}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 24,
              }}
              ListHeaderComponent={
                <View style={{ paddingVertical: 18, gap: 6 }}>
                  <Txt size={25} weight="700">
                    Klubbens resultater
                  </Txt>
                  <Txt muted size={14}>
                    Rangert etter soner som eies nå, deretter løypelengde.
                  </Txt>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <Txt size={18} weight="700" style={{ width: 28 }}>
                    {item.place}
                  </Txt>
                  <Avatar
                    name={item.display_name}
                    path={item.avatar_path}
                    size={42}
                  />
                  <View style={{ flex: 1 }}>
                    <Txt weight="700">
                      {item.display_name}
                      {item.user_id === userId ? " · deg" : ""}
                    </Txt>
                    <Txt muted size={13}>
                      {km(item.distance_m / 1000)} km løype
                    </Txt>
                  </View>
                  <Txt weight="700">
                    {item.zones} {item.zones === 1 ? "sone" : "soner"}
                  </Txt>
                </View>
              )}
              ListFooterComponent={
                <View style={{ paddingTop: 20, gap: 12 }}>
                  {moreScores && (
                    <Button
                      title={paging ? "Henter …" : "Vis flere medlemmer"}
                      secondary
                      disabled={paging}
                      onPress={loadMore}
                    />
                  )}
                  <Button title="Legg ut sone" onPress={newZone} />
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}
