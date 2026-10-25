import { useEffect } from "react";
import { Switch, View } from "react-native";
import { router } from "expo-router";
import { Button, Txt, styles } from "../components/ui";
import { Page } from "../components/SettingsUi";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";
import {
  syncWatch,
  useWatchStatus,
  watchSupported,
} from "../features/watch/sync";

export default function AppleWatch() {
  const user = useAuthStore((s) => s.session?.user.id);
  const enabled = useAppStore((s) => !!user && s.watchOwners.includes(user));
  const status = useWatchStatus();
  useEffect(() => {
    void syncWatch();
  }, []);
  return (
    <Page title="Apple Watch">
      <View style={{ padding: 22, gap: 28 }}>
        <Txt>
          Start turen på klokken. Se tid, distanse, tempo og puls, og bruk Pause
          når du tar en pause.
        </Txt>
        {!watchSupported ? (
          <Txt muted>
            Klokkestøtte krever et nytt VYRO-bygg for iPhone og Apple Watch.
            Expo Go og nettleseren kan ikke kobles til klokken.
          </Txt>
        ) : !user ? (
          <>
            <Txt muted>
              Logg inn for å knytte klokken og øktene til din konto.
            </Txt>
            <Button title="Logg inn" onPress={() => router.push("/account")} />
          </>
        ) : (
          <>
            <View style={styles.row}>
              <Txt style={{ flex: 1 }}>Koble denne kontoen til Apple Watch</Txt>
              <Switch
                accessibilityLabel="Koble denne kontoen til Apple Watch"
                value={enabled}
                onValueChange={(on) => {
                  useAppStore.setState((s) => ({
                    watchOwners: on
                      ? [...new Set([...s.watchOwners, user])]
                      : s.watchOwners.filter((id) => id !== user),
                  }));
                }}
              />
            </View>
            <Txt muted>
              {!status.paired
                ? "Koble Apple Watch til iPhone i Apples Watch-app først."
                : !status.installed
                  ? "Installer VYRO på klokken via Watch-appen på iPhone."
                  : status.reachable
                    ? "Klokken er tilgjengelig."
                    : "Øktene overføres når iPhone og klokken får kontakt. Åpne VYRO på begge enhetene for å prøve nå."}
            </Txt>
            {enabled && (
              <Button
                title={status.busy ? "Synkroniserer …" : "Synkroniser nå"}
                disabled={status.busy}
                onPress={() => {
                  void syncWatch();
                }}
              />
            )}
            {!!status.error && <Txt>{status.error}</Txt>}
          </>
        )}
        <Txt weight="700">På klokken</Txt>
        <Txt muted>
          Åpne VYRO, velg aktivitet og gi tilgang til posisjon og Helse ved
          første start. Pulsen vises når sensoren har en måling. Start økten på
          én enhet.
        </Txt>
        <Txt muted>
          Etter lagring beholdes en kopi på klokken til VYRO på iPhone har
          lagret økten. Åpne appen på iPhone for å få den inn i Treningslogg.
          Økten er privat til du velger å dele den.
        </Txt>
        <Txt muted>
          Du kan løpe uten telefonen etter første tilkobling. GPS-ruten må
          inneholde bevegelse for å lagres i VYRO. Pulsmålinger blir på klokken
          og i Apple Helse; de sendes ikke til VYROs server.
        </Txt>
      </View>
    </Page>
  );
}
