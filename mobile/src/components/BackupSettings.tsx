import { useState } from "react";
import { TextInput, View } from "react-native";
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
import {
  newRecoveryCode,
  normalizeRecoveryCode,
} from "../features/backup/cipher";
import { remoteVault, unlockVault, vaultKey } from "../features/backup/vault";
import { requireOwner } from "../features/social/profiles";

export function BackupSettings({ owner }: { owner: string }) {
  const enabled = useAppStore((s) => s.backupOwners?.includes(owner) ?? false);
  const pending = useAppStore(
    (s) =>
      s.workouts.filter(
        (w) =>
          (w.source === "gps" || w.source === "timer") &&
          w.ownerId === owner &&
          !s.backupReceipts[backupKey(owner, w.id)]?.startsWith("encrypted:"),
      ).length,
  );
  const status = useBackupStatus();
  const [confirm, setConfirm] = useState(false);
  const [setup, setSetup] = useState(false);
  const [generated, setGenerated] = useState("");
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const c = useTheme();
  const busy = status.owner === owner && status.busy;
  const prepare = async () => {
    if (working || busy) return;
    setWorking(true);
    setError("");
    try {
      const existing = await remoteVault(owner);
      const fresh = existing ? "" : await newRecoveryCode();
      requireOwner(owner);
      setGenerated(fresh);
      setCode("");
      setSetup(true);
    } catch {
      setError(
        "Kunne ikke åpne sikkerhetskopien. Kontroller forbindelsen og prøv igjen.",
      );
    } finally {
      setWorking(false);
    }
  };
  const toggle = () => {
    if (!enabled) {
      void prepare();
      return;
    }
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
      <Txt weight="700">Kryptert sikkerhetskopi</Txt>
      <Txt muted size={14}>
        Ta vare på økter ved bytte av telefon. Når du aktiverer dette, lagres
        hele rutene, tidene og notatene kryptert før de sendes. Bare enhetene
        dine og gjenopprettingskoden kan åpne kopien. Delte innlegg påvirkes
        ikke. Eldre kopier konverteres og verifiseres i grupper mens appen er
        åpen.
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
        disabled={!supabaseConfigured || working || (!enabled && busy)}
        onPress={toggle}
      />
      {!!error && <Txt accessibilityRole="alert">{error}</Txt>}
      {setup && (
        <View style={{ gap: 14 }}>
          <Txt weight="700">
            {generated
              ? "Ta vare på gjenopprettingskoden"
              : "Åpne sikkerhetskopien"}
          </Txt>
          <Txt muted size={14}>
            Lagre koden i en passordbehandler. Hvis du mister både enheten og
            koden, kan vi ikke gjenopprette øktene. Send aldri koden til andre.
          </Txt>
          {!!generated && (
            <Txt selectable size={16}>
              {generated}
            </Txt>
          )}
          <TextInput
            accessibilityLabel="Gjenopprettingskode"
            placeholder={
              generated
                ? "Skriv inn koden for å bekrefte at du har lagret den"
                : "Gjenopprettingskode"
            }
            placeholderTextColor={c.muted}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            maxLength={90}
            editable={!working}
            style={{
              color: c.text,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 15,
            }}
          />
          <Button
            title={working ? "Bekrefter …" : "Bekreft og aktiver"}
            disabled={working || !code}
            onPress={async () => {
              setWorking(true);
              setError("");
              try {
                if (
                  generated &&
                  normalizeRecoveryCode(code) !==
                    normalizeRecoveryCode(generated)
                )
                  throw new Error(
                    "Koden stemmer ikke. Kontroller alle tegnene.",
                  );
                await unlockVault(owner, code);
                requireOwner(owner);
                useAppStore.setState((s) => ({
                  backupOwners: [...new Set([...s.backupOwners, owner])],
                  backupReceipts: Object.fromEntries(
                    Object.entries(s.backupReceipts).filter(
                      ([id]) => !id.startsWith(`${owner}:`),
                    ),
                  ),
                }));
                setSetup(false);
                setCode("");
                setGenerated("");
                void syncBackup(owner);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Kunne ikke aktivere sikkerhetskopien.",
                );
              } finally {
                setWorking(false);
              }
            }}
          />
          <Button
            title="Avbryt"
            secondary
            disabled={working}
            onPress={() => {
              setSetup(false);
              setCode("");
              setGenerated("");
            }}
          />
        </View>
      )}
      {enabled && (
        <>
          <Button
            title="Skriv inn gjenopprettingskode"
            secondary
            disabled={working || busy}
            onPress={() => {
              void prepare();
            }}
          />
          <Button
            title="Vis min gjenopprettingskode"
            secondary
            disabled={working || busy}
            onPress={async () => {
              setWorking(true);
              setError("");
              try {
                const key = await vaultKey(owner);
                requireOwner(owner);
                setGenerated(key.code.match(/.{8}/g)!.join("-").toUpperCase());
                setCode("");
                setSetup(true);
              } catch {
                setError(
                  "Koden er ikke lagret på denne enheten. Bruk koden du tok vare på ved aktivering.",
                );
              } finally {
                setWorking(false);
              }
            }}
          />
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
        overføringer fra denne enheten. Gjenopprettingskoden lagres beskyttet på
        enheten og sendes aldri til serveren. Konkurransebevis kopieres ikke.
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
