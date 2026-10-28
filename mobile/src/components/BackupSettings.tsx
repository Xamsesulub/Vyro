import { useState } from "react";
import { View } from "react-native";
import { Button, Txt, useTheme } from "./ui";
import { useAppStore } from "../stores/useAppStore";
import { supabaseConfigured } from "../lib/supabase";
import {
  cancelBackup,
  deleteBackups,
  restoreBackup,
  syncBackup,
  useBackupStatus,
} from "../features/backup/sync";
import { backupKey } from "../features/backup/model";

export function BackupSettings({ owner }: { owner: string }) {
  const enabled = useAppStore((s) => s.backupOwners?.includes(owner) ?? false);
  const pending = useAppStore(
    (s) =>
      s.workouts.filter(
        (w) =>
          (w.source === "gps" || w.source === "timer") &&
          w.ownerId === owner &&
          !s.backupReceipts[backupKey(owner, w.id)],
      ).length,
  );
  const status = useBackupStatus();
  const [confirm, setConfirm] = useState(false);
  const c = useTheme();
  const busy = status.owner === owner && status.busy;
  const toggle = () => {
    cancelBackup();
    useAppStore.setState((s) => ({
      backupOwners: enabled
        ? s.backupOwners.filter((id) => id !== owner)
        : [...s.backupOwners, owner],
    }));
  };
  return (
    <View
      style={{
        gap: 12,
        borderTopWidth: 1,
        borderColor: c.border,
        paddingTop: 24,
      }}
    >
      <Txt weight="700">Privat sikkerhetskopi</Txt>
      <Txt muted size={14}>
        Ta vare på økter ved bytte av telefon. Når du aktiverer dette, lagres
        hele rutene, tidene og notatene privat på kontoen din, og tidligere
        sikkerhetskopierte økter hentes til denne enheten. Dette publiserer
        ingen innlegg. Konkurransebevis kopieres ikke.
      </Txt>
      <Txt size={14}>
        {enabled
          ? `${pending} økter venter på sikkerhetskopi`
          : "Av på denne enheten"}
      </Txt>
      {status.owner === owner && !!status.error && <Txt>{status.error}</Txt>}
      {status.owner === owner && !!status.lastSynced && !status.error && (
        <Txt size={12} muted>
          Sist synkronisert{" "}
          {new Date(status.lastSynced).toLocaleString("nb-NO")}
        </Txt>
      )}
      {!supabaseConfigured && (
        <Txt muted>Skytjenesten er ikke konfigurert i dette bygget.</Txt>
      )}
      <Button
        title={
          enabled
            ? "Slå av sikkerhetskopiering"
            : "Aktiver privat sikkerhetskopi"
        }
        secondary={enabled}
        disabled={!supabaseConfigured || (!enabled && busy)}
        onPress={toggle}
      />
      {enabled && (
        <>
          <Button
            title={busy ? "Synkroniserer …" : "Synkroniser nå"}
            secondary
            disabled={busy}
            onPress={() => {
              void syncBackup(owner);
            }}
          />
          <Button
            title="Gjenopprett også lokalt slettede økter"
            secondary
            disabled={busy}
            onPress={() => {
              void restoreBackup(owner);
            }}
          />
        </>
      )}
      <Txt muted size={12}>
        Lokal sletting fjerner ikke sikkerhetskopien. Å slå av stopper nye
        overføringer fra denne enheten. Sikkerhetskopier har tilgangskontroll på
        serveren; de er ikke ende-til-ende-kryptert.
      </Txt>
      <Button
        title={
          confirm
            ? "Bekreft sletting av alle sikkerhetskopier"
            : "Slett sikkerhetskopier i skyen"
        }
        secondary={!confirm}
        danger={confirm}
        disabled={busy || !supabaseConfigured}
        onPress={() => {
          if (!confirm) setConfirm(true);
          else {
            setConfirm(false);
            void deleteBackups(owner);
          }
        }}
      />
      {confirm && (
        <>
          <Txt muted size={12}>
            Lokale økter beholdes. Slå også av sikkerhetskopiering på andre
            enheter hvis de ikke skal sende nye økter.
          </Txt>
          <Button title="Avbryt" secondary onPress={() => setConfirm(false)} />
        </>
      )}
    </View>
  );
}
