import { useCallback, useRef, useState } from "react";
import { FlatList, Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { CloudPost } from "../../components/CloudPost";
import { PlacePost } from "../../components/PlacePost";
import { IconButton } from "../../components/SocialUi";
import { ActivityCard } from "../../components/ActivityCard";
import { Button, Chip, Txt, styles, Logo, useTheme } from "../../components/ui";
import { TurfEvents } from "../../components/TurfEvents";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAppStore } from "../../stores/useAppStore";
import { socialError } from "../../features/social/api";
import { FeedCursor, ReactionSummary } from "../../features/social/feed";
import { HomePost, loadHomeFeed } from "../../features/social/homeFeed";
import { Workout } from "../../features/activities/model";
export default function Home() {
  const id = useAuthStore((s) => s.session?.user.id);
  return <AccountGate>{id && <Feed key={id} userId={id} />}</AccountGate>;
}
function Feed({ userId }: { userId: string }) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState("Følger");
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [compose, setCompose] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const workouts = useAppStore((s) => s.workouts);
  const [next, setNext] = useState<FeedCursor | null>(null);
  const request = useRef<AbortController | null>(null);
  const storageError = useAppStore((s) => s.storageError);
  const kind = tab === "Delt på nytt" ? "reposted" : "following";
  const fetchPage = useCallback(
    async (cursor: FeedCursor | null = null) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError("");
      if (!cursor) {
        setPosts([]);
        setNext(null);
      }
      try {
        if (tab === "Mine økter") return;
        const page = await loadHomeFeed(
          userId,
          kind,
          cursor,
          controller.signal,
        );
        if (controller.signal.aborted) return;
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
        if (!controller.signal.aborted) setError(socialError(e));
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
  const own = workouts.filter((w) => w.ownerId === userId);
  type Row =
    { kind: "post"; value: HomePost } | { kind: "workout"; value: Workout };
  const rows: Row[] =
    tab === "Mine økter"
      ? own.map((value) => ({ kind: "workout", value }))
      : posts.map((value) => ({ kind: "post", value }));
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <View
        style={{
          borderBottomWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
        }}
      >
        <View
          style={[
            styles.row,
            {
              width: "100%",
              maxWidth: 680,
              alignSelf: "center",
              paddingHorizontal: 20,
              paddingVertical: 10,
            },
          ]}
        >
          <Logo width={Math.min(width - 150, 220)} color={c.text} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <IconButton
              name="plus"
              label={compose ? "Lukk deling" : "Lag innlegg"}
              onPress={() => setCompose(!compose)}
            />
            <IconButton
              name="search"
              label="Søk etter personer"
              onPress={() => router.push("/people")}
            />
          </View>
        </View>
      </View>
      <FlatList<Row>
        data={rows}
        refreshing={loading && rows.length > 0}
        onRefresh={refresh}
        keyExtractor={(row) => row.value.id}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 36,
          gap: 24,
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
        }}
        renderItem={({ item }) =>
          item.kind === "workout" ? (
            <ActivityCard workout={item.value} />
          ) : item.value.kind === "place" ? (
            <PlacePost post={item.value} userId={userId} onRemoved={refresh} />
          ) : (
            <CloudPost
              post={item.value}
              userId={userId}
              onRemoved={refresh}
              onReactionsChanged={updateReactions}
            />
          )
        }
        ListHeaderComponent={
          <View style={{ gap: 24 }}>
            {!!storageError && <Txt>{storageError}</Txt>}
            {compose && (
              <View
                style={{
                  gap: 12,
                  backgroundColor: c.raised,
                  padding: 16,
                  borderRadius: 20,
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
            <Txt size={24} weight="800">
              Hjem
            </Txt>
            <View style={styles.wrap}>
              {["Følger", "Delt på nytt", "Mine økter"].map((t) => (
                <Chip
                  key={t}
                  title={t}
                  selected={tab === t}
                  onPress={() => setTab(t)}
                />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Oppdater strømmen"
              accessibilityState={{ disabled: loading }}
              disabled={loading}
              onPress={refresh}
              style={{
                minHeight: 44,
                justifyContent: "center",
                alignSelf: "flex-end",
              }}
            >
              <Txt size={13} muted>
                {loading ? "Laster …" : "Oppdater"}
              </Txt>
            </Pressable>
            {!!error && <Txt>{error}</Txt>}
            {tab === "Følger" && <TurfEvents key={revision} userId={userId} />}
          </View>
        }
        ListFooterComponent={
          <View style={{ gap: 24 }}>
            {tab === "Mine økter" && !own.length && (
              <Txt muted>Ingen egne GPS-økter lagret på denne enheten.</Txt>
            )}
            {!loading && !error && !posts.length && tab !== "Mine økter" && (
              <>
                <Txt size={21} weight="700">
                  Turer å dele.
                </Txt>
                <Txt muted>
                  Følg venner for å se treningsøktene og stedene de deler.
                </Txt>
                <Button
                  title="Start første økt"
                  onPress={() => router.push("/track")}
                />
                <Button
                  title="Finn venner"
                  secondary
                  onPress={() => router.push("/people")}
                />
              </>
            )}
            {next && tab !== "Mine økter" && (
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
