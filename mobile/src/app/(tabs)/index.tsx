import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { CloudPost } from "../../components/CloudPost";
import { PlacePost } from "../../components/PlacePost";
import { IconButton } from "../../components/SocialUi";
import { ActivityCard } from "../../components/ActivityCard";
import { Button, Chip, Icon, Txt, styles, useTheme } from "../../components/ui";
import { TurfEvents } from "../../components/TurfEvents";
import { trainingTime } from "../../components/TrainingProgress";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAppStore } from "../../stores/useAppStore";
import { useOwnProfile } from "../../features/auth/useOwnProfile";
import { socialError } from "../../features/social/api";
import { FeedCursor, ReactionSummary } from "../../features/social/feed";
import { HomePost, loadHomeFeed } from "../../features/social/homeFeed";
import {
  Workout,
  km,
  total,
  weekWorkouts,
} from "../../features/activities/model";
import { ownTraining } from "../../features/activities/training";

type HomeTab = "following" | "reposted" | "own";
export default function Home() {
  const id = useAuthStore((s) => s.session?.user.id);
  const defaultTab = useAppStore((s) => s.homeFeed ?? "following");
  return (
    <AccountGate>
      {id && <Feed key={`${id}:${defaultTab}`} userId={id} />}
    </AccountGate>
  );
}
export function Feed({ userId }: { userId: string }) {
  const c = useTheme();
  const defaultTab = useAppStore((s) => s.homeFeed ?? "following");
  const [tab, setTab] = useState<HomeTab>(defaultTab);
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [compose, setCompose] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const workouts = useAppStore((s) => s.workouts);
  const [next, setNext] = useState<FeedCursor | null>(null);
  const [retryCursor, setRetryCursor] = useState<FeedCursor | null>(null);
  const request = useRef<AbortController | null>(null);
  const storageError = useAppStore((s) => s.storageError);
  const { profile } = useOwnProfile();
  const kind = tab === "reposted" ? "reposted" : "following";
  const chooseTab = useCallback((value: HomeTab) => {
    request.current?.abort();
    setTab(value);
    setPosts([]);
    setNext(null);
    setError("");
    setRetryCursor(null);
  }, []);
  const fetchPage = useCallback(
    async (cursor: FeedCursor | null = null) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError("");
      try {
        if (tab === "own") return;
        const page = await loadHomeFeed(
          userId,
          kind,
          cursor,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        // Keep the current feed visible during refresh. Account changes remount Feed.
        setPosts((previous) =>
          cursor
            ? [
                ...previous,
                ...page.posts.filter(
                  (p) => !previous.some((old) => old.id === p.id),
                ),
              ]
            : page.posts,
        );
        setNext(page.next);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(socialError(e));
          setRetryCursor(cursor);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          request.current = null;
        }
      }
    },
    [userId, kind, tab],
  );
  useFocusEffect(
    useCallback(() => {
      void fetchPage();
      return () => {
        request.current?.abort();
        request.current = null;
      };
    }, [fetchPage]),
  );
  const refresh = () => {
    setRevision((n) => n + 1);
    void fetchPage();
  };
  const updateReactions = useCallback(
    (id: string, summary: ReactionSummary) => {
      setPosts((previous) =>
        previous.map((post) =>
          post.id === id ? { ...post, ...summary } : post,
        ),
      );
    },
    [],
  );
  const own = useMemo(
    () =>
      ownTraining(workouts, userId).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [workouts, userId],
  );
  const weekly = weekWorkouts(own);
  const stats = total(weekly);
  type Row =
    { kind: "post"; value: HomePost } | { kind: "workout"; value: Workout };
  const rows: Row[] =
    tab === "own"
      ? own.map((value) => ({ kind: "workout", value }))
      : posts.map((value) => ({ kind: "post", value }));
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.surface }}
    >
      <View
        style={{
          borderBottomWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 10,
            maxWidth: 680,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <Txt size={26} weight="800">
            Hjem
          </Txt>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <IconButton
              name="plus"
              label={compose ? "Lukk deling" : "Lag innlegg"}
              variant="elevated"
              onPress={() => setCompose(!compose)}
            />
            <IconButton
              name="search"
              label="Søk etter personer"
              variant="elevated"
              onPress={() => router.push("/people")}
            />
          </View>
        </View>
      </View>
      <FlatList<Row>
        data={rows}
        refreshing={loading && rows.length > 0}
        onRefresh={refresh}
        keyExtractor={(row) => `${row.kind}:${row.value.id}`}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
          paddingBottom: 30,
          backgroundColor: c.raised,
        }}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 20,
              paddingBottom: 0,
              backgroundColor: c.surface,
              marginBottom: 10,
            }}
          >
            {item.kind === "workout" ? (
              <ActivityCard workout={item.value} />
            ) : item.value.kind === "place" ? (
              <PlacePost
                post={item.value}
                userId={userId}
                onRemoved={refresh}
              />
            ) : (
              <CloudPost
                post={item.value}
                userId={userId}
                onRemoved={refresh}
                onReactionsChanged={updateReactions}
              />
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            <View style={{ padding: 18, gap: 16 }}>
              {!!storageError && <Txt>{storageError}</Txt>}
              {compose && (
                <View
                  style={{
                    gap: 12,
                    padding: 18,
                    borderRadius: 20,
                    backgroundColor: c.surface,
                  }}
                >
                  <Txt weight="700">Hva vil du dele?</Txt>
                  <Button
                    title="Del treningsøkt"
                    icon="run"
                    secondary
                    onPress={() => router.push("/share-workout")}
                  />
                  <Button
                    title="Del bilde av et sted"
                    icon="photo"
                    secondary
                    onPress={() => router.push("/share-place")}
                  />
                </View>
              )}
              <View
                style={{
                  backgroundColor: c.surface,
                  padding: 18,
                  borderRadius: 20,
                  gap: 16,
                }}
              >
                <View style={styles.row}>
                  <Txt weight="700" size={17}>
                    Din uke så langt
                  </Txt>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Se din fremgang"
                    onPress={() => router.push("/profile")}
                    style={{ minHeight: 40, justifyContent: "center" }}
                  >
                    <Icon name="chevronRight" color={c.muted} size={20} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {[
                    [`${km(stats.distance)}`, "kilometer"],
                    [trainingTime(stats.seconds), "aktiv tid"],
                    [String(weekly.length), "økter"],
                  ].map(([value, label]) => (
                    <View key={label} style={{ flex: 1, gap: 3 }}>
                      <Txt size={21} weight="700">
                        {value}
                      </Txt>
                      <Txt muted size={12}>
                        {label}
                      </Txt>
                    </View>
                  ))}
                </View>
                <Button
                  title={own.length ? "Ta en ny tur" : "Start første økt"}
                  icon="record"
                  onPress={() => router.push("/track")}
                />
              </View>
              {profile?.display_name === "Løper" && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/edit-profile")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 16,
                    backgroundColor: c.surface,
                    borderRadius: 16,
                  }}
                >
                  <Icon name="user" color={c.accent} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt weight="600" size={14}>
                      Gjør profilen din klar
                    </Txt>
                    <Txt muted size={12}>
                      Velg navnet vennene dine ser.
                    </Txt>
                  </View>
                  <Icon name="chevronRight" size={18} color={c.muted} />
                </Pressable>
              )}
            </View>
            <View
              style={{
                backgroundColor: c.surface,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 10,
                gap: 10,
              }}
            >
              <View style={styles.wrap}>
                {(
                  [
                    ["following", "Følger"],
                    ["reposted", "Delt på nytt"],
                    ["own", "Mine økter"],
                  ] as const
                ).map(([value, label]) => (
                  <Chip
                    key={value}
                    title={label}
                    selected={tab === value}
                    onPress={() => {
                      if (tab !== value) chooseTab(value);
                    }}
                  />
                ))}
              </View>
              <View style={styles.row}>
                <Txt muted size={12}>
                  {tab === "own"
                    ? "Din private treningslogg"
                    : "Nyeste innlegg først"}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Oppdater strømmen"
                  accessibilityState={{ disabled: loading }}
                  disabled={loading}
                  onPress={refresh}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Txt size={12} muted>
                    {loading ? "Laster …" : "Oppdater"}
                  </Txt>
                </Pressable>
              </View>
              {tab === "following" && (
                <TurfEvents key={revision} userId={userId} />
              )}
            </View>
          </>
        }
        ListFooterComponent={
          <View style={{ padding: 20, backgroundColor: c.surface, gap: 18 }}>
            {!!error && (
              <View style={{ gap: 12 }}>
                <Txt>{error}</Txt>
                <Button
                  title="Prøv igjen"
                  secondary
                  disabled={loading}
                  onPress={() => void fetchPage(retryCursor)}
                />
              </View>
            )}
            {loading && !rows.length && (
              <ActivityIndicator
                accessibilityLabel="Henter innlegg"
                color={c.accent}
              />
            )}
            {!loading && !error && !rows.length && (
              <View
                style={{ gap: 16, alignItems: "center", paddingVertical: 28 }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    backgroundColor: c.raised,
                    borderRadius: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    name={tab === "own" ? "run" : "people"}
                    color={c.accent}
                    size={32}
                  />
                </View>
                <Txt size={21} weight="700" style={{ textAlign: "center" }}>
                  {tab === "own"
                    ? "Ta vare på din første tur."
                    : tab === "reposted"
                      ? "Et innlegg verdt å dele?"
                      : "Turer å dele."}
                </Txt>
                <Txt
                  muted
                  size={14}
                  style={{ textAlign: "center", maxWidth: 330 }}
                >
                  {tab === "own"
                    ? "GPS-øktene dine vises her når du lagrer dem. De er private til du velger å dele."
                    : tab === "reposted"
                      ? "Innlegg du deler videre fra strømmen, dukker opp her."
                      : "Følg venner for å se turene og stedene de deler. Du bestemmer når du vil dele noe selv."}
                </Txt>
                <View style={{ width: "100%", gap: 10 }}>
                  <Button
                    title={tab === "own" ? "Start en økt" : "Finn venner"}
                    secondary
                    onPress={() =>
                      router.push(tab === "own" ? "/track" : "/people")
                    }
                  />
                  {tab === "following" && own.length > 0 && (
                    <Button
                      title="Del en økt"
                      onPress={() => router.push("/share-workout")}
                    />
                  )}
                </View>
              </View>
            )}
            {next && tab !== "own" && (
              <Button
                title={loading ? "Laster …" : "Vis flere innlegg"}
                secondary
                disabled={loading}
                onPress={() => {
                  if (!loading) void fetchPage(next);
                }}
              />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
