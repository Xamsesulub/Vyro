import { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { ActivityPost, people } from "../features/social/demo";
import { useSocialStore } from "../stores/useSocialStore";
import { Txt, Button, styles, useTheme } from "./ui";
import WorkoutMap from "./WorkoutMap";
import { km, duration, pace } from "../features/activities/model";
export function SocialPost({ post }: { post: ActivityPost }) {
  const s = useSocialStore();
  const c = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const person = people.find((p) => p.id === post.authorId);
  const comments = s.comments.filter((x) => x.postId === post.id);
  const w = post.workout;
  return (
    <View
      style={{
        gap: 14,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Txt weight="700">
            {person?.name ?? "Du"}
            {w.source === "example" ? " · eksempelprofil" : ""}
          </Txt>
          <Txt size={12} muted>
            {new Date(w.date).toLocaleDateString("nb-NO")} · {w.sport}
          </Txt>
        </View>
        {person && (
          <Pressable
            accessibilityRole="button"
            onPress={() => s.follow(person.id)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Txt size={13} style={{ color: c.accent }}>
              {s.following.includes(person.id) ? "Følger" : "Følg"}
            </Txt>
          </Pressable>
        )}
      </View>
      <Txt size={21} weight="700">
        {w.title}
      </Txt>
      <View style={styles.row}>
        {[
          [km(w.distance), "km"],
          [duration(w.seconds), "tid"],
          [pace(w.distance, w.seconds), "min/km"],
        ].map(([v, label]) => (
          <View key={label}>
            <Txt size={24} weight="700">
              {v}
            </Txt>
            <Txt muted size={12}>
              {label}
            </Txt>
          </View>
        ))}
      </View>
      <WorkoutMap height={220} points={w.route ?? []} />
      <Txt size={11} muted>
        {w.source === "example"
          ? "Eksempeløkt og illustrert løype på ekte kart"
          : "GPS-rute · lokal forhåndsvisning"}
      </Txt>
      <View style={styles.row}>
        {[
          [s.likes.includes(post.id) ? "Likt" : "Lik", () => s.like(post.id)],
          [`Kommentarer (${comments.length})`, () => setExpanded(!expanded)],
          [
            s.reposts.includes(post.id) ? "Angre deling" : "Del på nytt",
            () => s.repost(post.id),
          ],
        ].map(([label, action]) => (
          <Pressable
            key={label as string}
            accessibilityRole="button"
            onPress={action as () => void}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Txt size={12} weight="600">
              {label as string}
            </Txt>
          </Pressable>
        ))}
      </View>
      {s.reposts.includes(post.id) && (
        <Txt muted size={12}>
          Delt på nytt i lokal forhåndsvisning · original forfatter beholdes
        </Txt>
      )}
      {expanded && (
        <View style={{ gap: 12 }}>
          {comments.map((comment) => (
            <View key={comment.id} style={{ gap: 4 }}>
              <Txt size={14}>
                <Txt weight="700">Du: </Txt>
                {comment.text}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Slett kommentaren"
                onPress={() => s.removeComment(comment.id)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Txt size={12} muted>
                  Slett
                </Txt>
              </Pressable>
            </View>
          ))}
          <TextInput
            accessibilityLabel="Skriv kommentar"
            value={text}
            onChangeText={setText}
            maxLength={500}
            placeholder="Skriv en kommentar"
            placeholderTextColor={c.muted}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              color: c.text,
            }}
          />
          <Button
            title="Legg til kommentar"
            disabled={!text.trim()}
            onPress={() => {
              if (s.comment(post.id, text)) setText("");
            }}
          />
        </View>
      )}
      {post.authorId === "me" && (
        <Button
          title="Trekk tilbake deling"
          secondary
          onPress={() => s.unshare(post.id)}
        />
      )}
    </View>
  );
}
