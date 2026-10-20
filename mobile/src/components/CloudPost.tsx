import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { client, Comment, Post, socialError } from "../features/social/api";
import { km, duration, pace } from "../features/activities/model";
import { Button, Txt, styles, useTheme } from "./ui";
import WorkoutMap from "./WorkoutMap";

export function CloudPost({
  post,
  userId,
  onRemoved,
}: {
  post: Post;
  userId: string;
  onRemoved: () => void;
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
      <View>
        <Txt weight="700">{post.profiles.display_name}</Txt>
        <Txt muted size={12}>
          @{post.profiles.username} ·{" "}
          {new Date(post.recorded_at).toLocaleDateString("nb-NO")}
        </Txt>
      </View>
      <Txt size={21} weight="700">
        {post.title}
      </Txt>
      <View style={styles.row}>
        <Txt weight="700">{km(Number(post.distance_km))} km</Txt>
        <Txt weight="700">{duration(post.seconds)}</Txt>
        <Txt weight="700">
          {pace(Number(post.distance_km), post.seconds)} min/km
        </Txt>
      </View>
      <WorkoutMap points={post.route} height={220} />
      <Txt muted size={12}>
        {post.sport} · Delt med innloggede VYRO-brukere
      </Txt>
      <Reactions postId={post.id} userId={userId} />
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

function Reactions({ postId, userId }: { postId: string; userId: string }) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all([
      client()
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId),
      client()
        .from("likes")
        .select("user_id")
        .eq("post_id", postId)
        .eq("user_id", userId),
      client()
        .from("reposts")
        .select("user_id")
        .eq("post_id", postId)
        .eq("user_id", userId),
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
    };
  }, [postId, userId]);
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
      if (table === "likes") {
        setLiked(!present);
        setCount((n) => Math.max(0, n + (present ? -1 : 1)));
      } else setReposted(!present);
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
