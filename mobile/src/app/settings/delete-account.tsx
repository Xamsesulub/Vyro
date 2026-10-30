import { useRef, useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { Page } from "../../components/SettingsUi";
import { Button, Txt, useTheme } from "../../components/ui";
import { useAuthStore } from "../../stores/useAuthStore";
import { deleteOwnAccount } from "../../features/auth/deleteAccount";
export default function DeleteAccount() {
  const owner = useAuthStore((s) => s.session?.user.id);
  return (
    <AccountGate>{owner && <Form key={owner} owner={owner} />}</AccountGate>
  );
}
function Form({ owner }: { owner: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const c = useTheme();
  return (
    <Page title="Slett konto" plain>
      <View style={{ padding: 22, gap: 20 }}>
        <Txt weight="700" size={22}>
          Dette kan ikke angres
        </Txt>
        <Txt>
          Kontoen, private sikkerhetskopier, bilder, innlegg, kommentarer, ruter
          og klubbene du eier blir slettet. Økter på denne enheten fjernes.
          Kopier du har eksportert eller lagret på andre enheter må slettes der.
        </Txt>
        <Txt muted>
          Du må ha logget inn de siste 15 minuttene. Ta vare på økter du vil
          beholde under Data og sikkerhetskopi først.
        </Txt>
        <Button
          title="Til data og eksport"
          secondary
          disabled={busy}
          onPress={() => router.push("/settings/data")}
        />
        <Txt>Skriv SLETT for å bekrefte.</Txt>
        <TextInput
          accessibilityLabel="Bekreft kontosletting"
          value={confirmation}
          onChangeText={setConfirmation}
          autoCorrect={false}
          maxLength={5}
          editable={!busy}
          autoCapitalize="characters"
          style={{
            color: c.text,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: 16,
          }}
        />
        <Button
          title={busy ? "Sletter konto …" : "Slett kontoen min permanent"}
          danger
          disabled={busy || confirmation !== "SLETT"}
          onPress={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError("");
            try {
              const result = await deleteOwnAccount(owner);
              if (!result.localCleanupComplete)
                Alert.alert(
                  "Kontoen er slettet",
                  "Oppryddingen på denne enheten kunne ikke bekreftes. For å fjerne alle lokale kopier må du slette VYRO fra enheten. Ta først vare på eventuelle økter som tilhører andre kontoer.",
                );
              if (!useAuthStore.getState().session) router.replace("/account");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Kunne ikke slette kontoen.",
              );
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        />
        {!!error && <Txt accessibilityRole="alert">{error}</Txt>}
      </View>
    </Page>
  );
}
