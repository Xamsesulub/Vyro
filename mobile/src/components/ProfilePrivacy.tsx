import { useRef, useState } from "react";
import { Switch } from "react-native";
import { router } from "expo-router";
import { PageNote, SettingsGroup, SettingsRow } from "./SettingsUi";
import { useOwnProfile } from "../features/auth/useOwnProfile";
import { changePrivacy } from "../features/social/profiles";
import { socialError } from "../features/social/api";
import { useAuthStore } from "../stores/useAuthStore";

export default function ProfilePrivacy() {
  const { profile, failed } = useOwnProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <>
      <SettingsGroup
        title="Kontoens synlighet"
        note="Navn, brukernavn og profilbilde kan fortsatt finnes i søk. Eksisterende følgere beholdes. Ruter du selv har bidratt med til ruteforslag og soner, er fortsatt offentlige bidrag."
      >
        <SettingsRow
          title="Privat konto"
          description={
            profile?.is_private
              ? "Bare godkjente følgere kan se innleggene dine."
              : "Andre VYRO-brukere kan følge deg uten godkjenning. Du velger fortsatt hvem hvert innlegg deles med."
          }
          end={
            <Switch
              accessibilityLabel="Privat konto"
              value={profile?.is_private ?? false}
              disabled={busy || !profile}
              onValueChange={async (value) => {
                if (lock.current || !profile) return;
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  await changePrivacy(profile.id, value);
                } catch (e) {
                  if (useAuthStore.getState().session?.user.id === profile.id)
                    setError(socialError(e));
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            />
          }
        />
        <SettingsRow
          title="Administrer følgere"
          onPress={() => router.push("/connections")}
        />
      </SettingsGroup>
      {!!(error || failed) && (
        <PageNote>
          {error ||
            "Kunne ikke hente kontoinnstillingen. Åpne siden igjen for å prøve på nytt."}
        </PageNote>
      )}
    </>
  );
}
