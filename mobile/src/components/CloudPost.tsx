import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { client, Comment, Post, socialError } from "../features/social/api";
import { FeedPost, ReactionSummary } from "../features/social/feed";
import { km, duration, pace } from "../features/activities/model";
import { Button, Txt, styles, useTheme } from "./ui";
import WorkoutMap from "./WorkoutMap";
import FootballMap, { FootballSpeed } from "./FootballMap";
import { Avatar } from "./SocialUi";

export function CloudPost({
  post,
  userId,
  onRemoved,
  onReactionsChanged,
}: {
  post: FeedPost;
  userId: string;
  onRemoved: () => void;
  onReactionsChanged?: (id: string, summary: ReactionSummary) => void;
}) {
  const c = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(socialError(e));
    } finally {
      setBusy(false);
    }
  }
  async function loadComments() {
    const r = await client()
      .from("comments")
      .select(
        "id,author_id,body,profiles!comments_author_id_fkey(id,username,display_name)",
      )
      .eq("post_id", post.id)
      .order("created_at")
      .limit(100);
    if (r.error) throw r.error;
    setComments(r.data as unknown as Comment[]);
  }
  return (
    <View
      style={{
        gap: 16,
        borderBottomWidth: 1,
        borderColor: c.border,
        paddingBottom: 24,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={post.profiles.display_name} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt weight="700">{post.profiles.display_name}</Txt>
          <Txt muted size={12}>
            @{post.profiles.username} ·{" "}
            {new Date(post.recorded_at).toLocaleDateString("nb-NO")}
          </Txt>
        </View>
      </View>
      <Txt size={24} weight="700">
        {post.title}
      </Txt>
      <View style={styles.row}>
        {[
          ["Distanse", `${km(Number(post.distance_km))} km`],
          ["Tid", duration(post.seconds)],
          post.sport === "Fotball"
            ? [
                "Snittfart",
                `${post.seconds > 0 ? ((Number(post.distance_km) * 3600) / post.seconds).toFixed(1).replace(".", ",") : "—"} km/t`,
              ]
            : ["Tempo", `${pace(Number(post.distance_km), post.seconds)}`],
        ].map(([label, value]) => (
          <View key={label} style={{ gap: 5, flexShrink: 1 }}>
            <Txt muted size={12}>
              {label}
            </Txt>
            <Txt weight="700" size={21}>
              {value}
            </Txt>
            {label === "Tempo" && (
              <Txt size={11} muted>
                min/km
              </Txt>
            )}
          </View>
        ))}
      </View>
      <PostMap
        key={post.id}
        postId={post.id}
        football={post.sport === "Fotball"}
      />
      <Txt muted size={12}>
        {post.sport} ·{" "}
        {post.audience === "followers"
          ? "Delt med følgere"
          : "Delt med innloggede VYRO-brukere"}
      </Txt>
      <Reactions
        key={`${post.id}:${post.like_count}:${post.liked}:${post.reposted}`}
        postId={post.id}
        userId={userId}
        onChange={onReactionsChanged}
        summary={
          post.like_count == null
            ? undefined
            : {
                like_count: Number(post.like_count),
                liked: !!post.liked,
                reposted: !!post.reposted,
              }
        }
      />
      <Button
        title={expanded ? "Skjul kommentarer" : "Vis kommentarer"}
        secondary
        disabled={busy}
        onPress={() =>
          action(async () => {
            if (!expanded) await loadComments();
            setExpanded(!expanded);
          })
        }
      />
      {expanded && (
        <>
          {comments.map((comment) => (
            <View key={comment.id} style={{ gap: 8 }}>
              <Txt>
                <Txt weight="700">{comment.profiles.display_name}: </Txt>
                {comment.body}
              </Txt>
              {comment.author_id === userId && (
                <Button
                  title="Slett kommentar"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    action(async () => {
                      const r = await client()
                        .from("comments")
                        .delete()
                        .eq("id", comment.id)
                        .eq("author_id", userId);
                      if (r.error) throw r.error;
                      await loadComments();
                    })
                  }
                />
              )}
            </View>
          ))}
          {comments.length === 100 && (
            <Txt muted size={12}>
              Viser de første 100 kommentarene.
            </Txt>
          )}
          <TextInput
            accessibilityLabel="Skriv kommentar"
            placeholder="Skriv en kommentar"
            placeholderTextColor={c.muted}
            value={text}
            onChangeText={setText}
            maxLength={500}
            style={{
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              padding: 14,
              color: c.text,
            }}
          />
          <Button
            title="Publiser kommentar"
            disabled={busy || !text.trim()}
            onPress={() =>
              action(async () => {
                const r = await client().from("comments").insert({
                  author_id: userId,
                  post_id: post.id,
                  body: text.trim(),
                });
                if (r.error) throw r.error;
                setText("");
                await loadComments();
              })
            }
          />
        </>
      )}
      {post.author_id === userId && (
        <Button
          title={
            confirm
              ? "Bekreft: trekk tilbake innlegget"
              : "Trekk tilbake deling"
          }
          secondary
          disabled={busy}
          onPress={() => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            void action(async () => {
              const r = await client()
                .from("posts")
                .delete()
                .eq("id", post.id)
                .eq("author_id", userId);
              if (r.error) throw r.error;
              onRemoved();
            });
          }}
        />
      )}
      {!!error && <Txt>{error}</Txt>}
    </View>
  );
}

function PostMap({ postId, football }: { postId: string; football: boolean }) {
  const [open, setOpen] = useState(false);
  const [route, setRoute] = useState<Post["route"] | null>(null);
  const [error, setError] = useState("");
  const [maxSpeed, setMaxSpeed] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await client()
          .from("posts")
          .select("route,max_speed_kmh")
          .eq("id", postId)
          .abortSignal(controller.signal)
          .single();
        if (result.error) throw result.error;
        if (!controller.signal.aborted) {
          setRoute(result.data.route as Post["route"]);
          setMaxSpeed(
            result.data.max_speed_kmh == null
              ? null
              : Number(result.data.max_speed_kmh),
          );
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(socialError(e));
      }
    })();
    return () => controller.abort();
  }, [postId, open, football]);
  return (
    <>
      <Button
        title={
          open
            ? "Skjul rutekart"
            : football
              ? "Vis rute og varmekart"
              : "Vis rutekart"
        }
        secondary
        icon="map"
        onPress={() => {
          setRoute(null);
          setError("");
          setOpen((value) => !value);
        }}
      />
      {open &&
        (error ? (
          <Txt>{error}</Txt>
        ) : route ? (
          football ? (
            <View style={{ gap: 16 }}>
              <FootballMap points={route} height={260} />
              <FootballSpeed value={maxSpeed} />
            </View>
          ) : (
            <WorkoutMap points={route} height={220} />
          )
        ) : (
          <Txt muted>Laster kart …</Txt>
        ))}
    </>
  );
}

function Reactions({
  postId,
  userId,
  summary,
  onChange,
}: {
  postId: string;
  userId: string;
  summary?: ReactionSummary;
  onChange?: (id: string, summary: ReactionSummary) => void;
}) {
  const [liked, setLiked] = useState(summary?.liked ?? false);
  const [reposted, setReposted] = useState(summary?.reposted ?? false);
  const [count, setCount] = useState(summary?.like_count ?? 0);
  const [ready, setReady] = useState(summary != null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const {
    like_count,
    liked: initialLiked,
    reposted: initialReposted,
  } = summary ?? {};
  useEffect(() => {
    if (like_count != null) return;
    const controller = new AbortController();
    let live = true;
    Promise.all([
      client()
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
        .abortSignal(controller.signal),
      client()
        .from("likes")
        .select("user_id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .abortSignal(controller.signal),
      client()
        .from("reposts")
        .select("user_id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .abortSignal(controller.signal),
    ])
      .then(([total, like, repost]) => {
        if (!live) return;
        const problem = total.error || like.error || repost.error;
        if (problem) {
          setError(socialError(problem));
          return;
        }
        setCount(total.count ?? 0);
        setLiked(!!like.data?.length);
        setReposted(!!repost.data?.length);
        setReady(true);
      })
      .catch((e) => {
        if (live) setError(socialError(e));
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [postId, userId, like_count, initialLiked, initialReposted]);
  async function toggle(table: "likes" | "reposts", present: boolean) {
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      const r = present
        ? await client()
            .from(table)
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId)
        : await client()
            .from(table)
            .upsert(
              { post_id: postId, user_id: userId },
              { onConflict: "user_id,post_id", ignoreDuplicates: true },
            );
      if (r.error) throw r.error;
      const updated = {
        like_count:
          table === "likes" ? Math.max(0, count + (present ? -1 : 1)) : count,
        liked: table === "likes" ? !present : liked,
        reposted: table === "reposts" ? !present : reposted,
      };
      if (table === "likes") {
        setLiked(!present);
        setCount((n) => Math.max(0, n + (present ? -1 : 1)));
      } else setReposted(!present);
      onChange?.(postId, updated);
    } catch (e) {
      setError(socialError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <View style={styles.wrap}>
        <Button
          secondary
          icon="heart"
          title={`${liked ? "Likt" : "Lik"} · ${count}`}
          disabled={busy || !ready}
          onPress={() => toggle("likes", liked)}
        />
        <Button
          secondary
          title={reposted ? "Angre repost" : "Del på nytt"}
          disabled={busy || !ready}
          onPress={() => toggle("reposts", reposted)}
        />
      </View>
      {reposted && (
        <Txt muted size={12}>
          Repost lagret. Originalinnlegget beholdes.
        </Txt>
      )}
      {!!error && <Txt>{error}</Txt>}
    </>
  );
}
