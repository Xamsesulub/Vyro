import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import {
  Page,
  PageNote,
  SettingsGroup,
  SettingsRow,
} from "../../components/SettingsUi";
import { BackupSettings } from "../../components/BackupSettings";
import { Button, Txt } from "../../components/ui";
import { appPersistence, useAppStore } from "../../stores/useAppStore";
import { useAuthStore } from "../../stores/useAuthStore";
export default function DataSettings() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const error = useAppStore((s) => s.storageError);
  const [busy, setBusy] = useState(false);
  return (
    <Page title="Data og sikkerhetskopi">
      {!!error && (
        <View style={{ padding: 22, gap: 12 }}>
          <Txt>{error}</Txt>
          <Button
            title={busy ? "Prøver igjen …" : "Prøv lokal lagring igjen"}
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void appPersistence.retry().finally(() => setBusy(false));
            }}
          />
        </View>
      )}
      <SettingsGroup title="På denne enheten">
        <SettingsRow
          title="Din treningslogg"
          description="Se og administrer lagrede økter."
          icon="chart"
          onPress={() =>
            router.push({ pathname: "/profile", params: { tab: "activities" } })
          }
        />
        <SettingsRow
          title="Eksporter en rute"
          description="Åpne en GPS-økt i treningsloggen og velg GPX-eksport."
          icon="share"
          onPress={() =>
            router.push({ pathname: "/profile", params: { tab: "activities" } })
          }
        />
      </SettingsGroup>
      {userId ? (
        <View style={{ padding: 22 }}>
          <BackupSettings key={userId} owner={userId} />
        </View>
      ) : (
        <SettingsGroup>
          <SettingsRow
            title="Logg inn for sikkerhetskopiering"
            onPress={() => router.push("/account")}
          />
        </SettingsGroup>
      )}
      <PageNote>
        En eksportert GPX-fil kan inneholde hele ruten. Del filen bare med dem
        du vil gi tilgang til den.
      </PageNote>
    </Page>
  );
}
