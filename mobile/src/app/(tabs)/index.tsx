import { useCallback, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { CloudPost } from "../../components/CloudPost";
import { ActivityCard } from "../../components/ActivityCard";
import {
  Button,
  Chip,
  Screen,
  Txt,
  styles,
  Logo,
  useTheme,
} from "../../components/ui";
import { Reveal } from "../../components/motion";
import { TurfEvents } from "../../components/TurfEvents";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAppStore } from "../../stores/useAppStore";
import { client, Post, socialError } from "../../features/social/api";
export default function Home() {
  const id = useAuthStore((s) => s.session?.user.id);
  return <AccountGate>{id && <Feed key={id} userId={id} />}</AccountGate>;
}
function Feed({ userId }: { userId: string }) {
  const c = useTheme();
  const [tab, setTab] = useState("Følger");
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const workouts = useAppStore((s) => s.workouts);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      async function load() {
        setLoading(true);
        setError("");
        setPosts([]);
        try {
          let query = client()
            .from("posts")
            .select("*,profiles!posts_author_id_fkey(id,username,display_name)")
            .order("created_at", { ascending: false })
            .limit(30);
          if (tab === "Følger") {
            const r = await client()
              .from("follows")
              .select("following_id")
              .eq("follower_id", userId);
            if (r.error) throw r.error;
            query = query.in("author_id", [
              userId,
              ...r.data.map((f) => f.following_id),
            ]);
          } else if (tab === "Delt på nytt") {
            const r = await client()
              .from("reposts")
              .select("post_id")
              .eq("user_id", userId);
            if (r.error) throw r.error;
            if (!r.data.length) {
              if (live) setLoading(false);
              return;
            }
            query = query.in(
              "id",
              r.data.map((p) => p.post_id),
            );
          } else if (tab === "Mine økter") {
            if (live) setLoading(false);
            return;
          }
          const r = await query;
          if (r.error) throw r.error;
          if (live) setPosts(r.data as unknown as Post[]);
        } catch (e) {
          if (live) setError(socialError(e));
        } finally {
          if (live) setLoading(false);
        }
      }
      void load();
      return () => {
        live = false;
      };
      // revision explicitly refreshes the same query after a mutation or tap.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, tab, revision]),
  );
  const own = workouts.filter((w) => w.ownerId === userId);
  return (
    <Screen>
      <View style={styles.row}>
        <Logo small color={c.text} />
        <Button
          title="Del økt"
          icon="arrow"
          onPress={() => router.push("/share-workout")}
        />
      </View>
      <Reveal>
        <View style={{ gap: 5 }}>
          <Txt size={30} weight="800" style={{ letterSpacing: -0.8 }}>
            Turer å dele.
          </Txt>
          <Txt muted size={14}>
            Små øyeblikk. Flere kilometer sammen.
          </Txt>
        </View>
      </Reveal>
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
      <Button
        title={loading ? "Laster …" : "Oppdater"}
        secondary
        disabled={loading}
        onPress={() => setRevision((n) => n + 1)}
      />
      {!!error && <Txt>{error}</Txt>}
      {tab === "Følger" && <TurfEvents key={revision} userId={userId} />}
      {tab === "Mine økter" ? (
        <>
          {!own.length && (
            <Txt muted>Ingen egne GPS-økter lagret på denne enheten.</Txt>
          )}
          {own.map((w) => (
            <ActivityCard key={w.id} workout={w} />
          ))}
        </>
      ) : (
        posts.map((p) => (
          <CloudPost
            key={p.id}
            post={p}
            userId={userId}
            onRemoved={() => setRevision((n) => n + 1)}
          />
        ))
      )}
      {!loading && !error && !posts.length && tab !== "Mine økter" && (
        <>
          <Txt muted>Ingen delte økter her ennå.</Txt>
          <Button
            title="Finn løpere"
            secondary
            onPress={() => router.push("/community")}
          />
        </>
      )}
      {posts.length === 30 && (
        <Txt muted size={12}>
          Viser de 30 nyeste innleggene.
        </Txt>
      )}
    </Screen>
  );
}
