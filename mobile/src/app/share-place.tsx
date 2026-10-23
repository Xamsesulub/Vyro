import { useRef, useState } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { Field } from "../components/SocialUi";
import { Button, Chip, Screen, Txt, styles, useTheme } from "../components/ui";
import { choosePhoto, PreparedPhoto } from "../features/places/photos";
import { publishPlace } from "../features/places/api";
import { validatePlace } from "../features/places/model";
import { socialError } from "../features/social/api";
import { useAuthStore } from "../stores/useAuthStore";
export default function SharePlace() {
  const user = useAuthStore((s) => s.session?.user.id);
  return (
    <AccountGate>{user && <Composer key={user} userId={user} />}</AccountGate>
  );
}
function Composer({ userId }: { userId: string }) {
  const c = useTheme();
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [caption, setCaption] = useState("");
  const [place, setPlace] = useState("");
  const [audience, setAudience] = useState<"followers" | "everyone">(
    "followers",
  );
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  return (
    <Screen>
      <Button
        title="Tilbake"
        secondary
        disabled={busy}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      />
      <Txt size={28} weight="800">
        Et sted å dele
      </Txt>
      <Txt muted size={14}>
        Et fint stopp, en utsikt eller en ny favorittsti. Del et bilde fra
        turen.
      </Txt>
      {photo ? (
        <Image
          accessibilityLabel="Forhåndsvisning av valgt bilde"
          source={{ uri: photo.preview }}
          style={{
            width: "100%",
            aspectRatio: 4 / 3,
            borderRadius: 20,
            backgroundColor: c.raised,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            minHeight: 180,
            borderRadius: 20,
            backgroundColor: c.raised,
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Txt muted style={{ textAlign: "center" }}>
            Velg et bilde fra biblioteket ditt
          </Txt>
        </View>
      )}
      <Button
        title={photo ? "Velg et annet bilde" : "Velg bilde"}
        icon="photo"
        secondary
        disabled={busy}
        onPress={() => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError("");
          void choosePhoto()
            .then((p) => {
              if (p) setPhoto(p);
            })
            .catch((e) =>
              setError(
                e instanceof Error ? e.message : "Kunne ikke åpne bildet.",
              ),
            )
            .finally(() => {
              lock.current = false;
              setBusy(false);
            });
        }}
      />
      <Field
        accessibilityLabel="Bildetekst"
        placeholder="Hva vil du fortelle om stedet?"
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={1000}
        editable={!busy}
        style={{ minHeight: 100, textAlignVertical: "top" }}
      />
      <Field
        accessibilityLabel="Stedsnavn"
        placeholder="Stedsnavn (valgfritt)"
        value={place}
        onChangeText={setPlace}
        maxLength={100}
        editable={!busy}
      />
      <Txt weight="700">Hvem kan se bildet?</Txt>
      <View style={styles.wrap}>
        {(
          [
            ["followers", "Følgere"],
            ["everyone", "Alle i VYRO"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            title={label}
            selected={audience === value}
            onPress={() => {
              if (!busy) setAudience(value);
            }}
          />
        ))}
      </View>
      <Txt muted size={12}>
        Posisjonsdata i bildefilen fjernes. Bare stedsnavnet du skriver deles.
        Bildet blir ikke en treningsøkt.
      </Txt>
      {!!error && <Txt>{error}</Txt>}
      <Button
        title={busy ? "Klargjør …" : "Publiser bilde"}
        disabled={busy || !photo || !caption.trim()}
        onPress={() => {
          if (!photo || lock.current) return;
          try {
            validatePlace(caption, place);
          } catch (e) {
            setError((e as Error).message);
            return;
          }
          lock.current = true;
          setBusy(true);
          setError("");
          void publishPlace(userId, photo, caption, place, audience)
            .then(() => router.replace("/"))
            .catch((e) => setError(socialError(e)))
            .finally(() => {
              lock.current = false;
              setBusy(false);
            });
        }}
      />
    </Screen>
  );
}
