import { useRef, useState } from "react";
import { View } from "react-native";
import { Avatar } from "./SocialUi";
import { Button, Txt } from "./ui";
import { useOwnProfile } from "../features/auth/useOwnProfile";
import { choosePhoto } from "../features/places/photos";
import { changeAvatar } from "../features/social/profiles";
import { socialError } from "../features/social/api";
import { useAuthStore } from "../stores/useAuthStore";

export default function ProfilePhotoEditor({
  owner,
  name,
}: {
  owner: string;
  name: string;
}) {
  const { profile } = useOwnProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function change(remove = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const photo = remove ? null : await choosePhoto(true);
      if (!remove && !photo) return;
      await changeAvatar(owner, photo, profile?.avatar_path);
    } catch (e) {
      if (useAuthStore.getState().session?.user.id === owner)
        setError(socialError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ alignItems: "center", padding: 22, gap: 12 }}>
      <Avatar name={name} path={profile?.avatar_path} size={86} />
      <Button
        title={busy ? "Lagrer bilde …" : "Velg profilbilde"}
        secondary
        disabled={busy}
        onPress={() => void change()}
      />
      {!!profile?.avatar_path && (
        <Button
          title="Fjern profilbilde"
          secondary
          disabled={busy}
          onPress={() => void change(true)}
        />
      )}
      <Txt muted size={12}>
        Profilbildet er synlig for andre VYRO-brukere, også når kontoen er
        privat.
      </Txt>
      {!!error && <Txt accessibilityRole="alert">{error}</Txt>}
    </View>
  );
}
