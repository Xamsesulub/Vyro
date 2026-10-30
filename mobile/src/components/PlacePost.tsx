import { useEffect, useRef, useState } from "react";
import { Image, View } from "react-native";
import { PlacePost as Place } from "../features/places/model";
import { removePlace } from "../features/places/api";
import { client, socialError } from "../features/social/api";
import { Avatar } from "./SocialUi";
import { Button, Txt, useTheme } from "./ui";
import SafetyActions from "./SafetyActions";
export function PlacePost({
  post,
  userId,
  onRemoved,
}: {
  post: Place;
  userId: string;
  onRemoved: () => void;
}) {
  const c = useTheme();
  const [image, setImage] = useState<{
    uri: string;
    path: string;
    user: string;
  } | null>(null);
  const uri =
    image?.path === post.photo_path && image.user === userId ? image.uri : null;
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let live = true;
    const reader = new FileReader();
    // Authenticated download instead of a reusable public/signed image URL.
    client()
      .storage.from("place-photos")
      .download(post.photo_path)
      .then(({ data, error }) => {
        if (!live) return;
        if (error) throw error;
        reader.onload = () => {
          if (live) {
            setImage({
              uri: String(reader.result),
              path: post.photo_path,
              user: userId,
            });
            setError("");
          }
        };
        reader.onerror = () => {
          if (live) setError("Kunne ikke åpne bildet.");
        };
        reader.readAsDataURL(data);
      })
      .catch((e) => {
        if (live) setError(socialError(e));
      });
    return () => {
      live = false;
      if (reader.readyState === 1) reader.abort();
    };
  }, [post.photo_path, userId, revision]);
  return (
    <View
      style={{
        gap: 16,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Avatar
          name={post.profiles.display_name}
          path={post.profiles.avatar_path}
        />
        <View style={{ flex: 1 }}>
          <Txt weight="700">{post.profiles.display_name}</Txt>
          <Txt muted size={12}>
            {new Date(post.created_at).toLocaleDateString("nb-NO")} · Stedsbilde
          </Txt>
        </View>
        <SafetyActions
          owner={userId}
          target={post.author_id}
          name={post.profiles.display_name}
          placeId={post.id}
          onBlocked={onRemoved}
        />
      </View>
      {uri ? (
        <Image
          accessibilityLabel={post.caption}
          source={{ uri }}
          resizeMode="cover"
          style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 16 }}
        />
      ) : (
        <View
          style={{
            minHeight: 180,
            backgroundColor: c.raised,
            borderRadius: 16,
            padding: 20,
            justifyContent: "center",
          }}
        >
          <Txt muted>{error || "Laster bilde …"}</Txt>
          {!!error && (
            <Button
              title="Last bildet på nytt"
              secondary
              onPress={() => setRevision((n) => n + 1)}
            />
          )}
        </View>
      )}
      {!!post.place_name && <Txt weight="700">{post.place_name}</Txt>}
      <Txt>{post.caption}</Txt>
      <Txt muted size={12}>
        {post.audience === "followers"
          ? "Delt med følgere"
          : "Delt med innloggede VYRO-brukere"}
      </Txt>
      {post.author_id === userId && (
        <Button
          title={
            confirm ? "Bekreft: trekk tilbake bildet" : "Trekk tilbake bildet"
          }
          secondary
          disabled={busy}
          onPress={() => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            void removePlace(post.id, userId, post.photo_path)
              .then(onRemoved)
              .catch((e) => setError(socialError(e)))
              .finally(() => {
                lock.current = false;
                setBusy(false);
              });
          }}
        />
      )}
      {confirm && (
        <Button
          title="Avbryt"
          secondary
          disabled={busy}
          onPress={() => setConfirm(false)}
        />
      )}
      {uri && !!error && <Txt>{error}</Txt>}
    </View>
  );
}
