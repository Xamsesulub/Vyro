import { useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { AccountGate } from "../../components/AccountGate";
import { Page, SettingsGroup, SettingsRow } from "../../components/SettingsUi";
import { Button, Txt, useTheme } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/useAuthStore";
import { authRedirectUrl } from "../../features/auth/links";
import { authErrorMessage } from "../../features/auth/validation";

export default function AccountSettings() {
  const user = useAuthStore((s) => s.session?.user);
  return (
    <AccountGate>
      {user && <AccountForm key={user.id} user={user} />}
    </AccountGate>
  );
}
function AccountForm({ user }: { user: User }) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const c = useTheme();
  const providers = [
    ...new Set(user.identities?.map((i) => i.provider) ?? ["email"]),
  ]
    .map((p) => ({ apple: "Apple", google: "Google", email: "E-post" })[p] ?? p)
    .join(", ");
  return (
    <Page title="Konto og sikkerhet">
      <SettingsGroup title="Innlogging">
        <SettingsRow title="E-postadresse" description={user.email} />
        <SettingsRow title="Innloggingsmåter" value={providers} />
        <SettingsRow
          title="Endre e-postadresse"
          onPress={() => {
            setEditing(!editing);
            setMessage("");
          }}
        />
        <SettingsRow
          title="Endre passord"
          description="Velg et nytt passord for innlogging med e-post."
          onPress={() => router.push("/auth/new-password")}
        />
      </SettingsGroup>
      {editing && (
        <SettingsGroup
          title="Ny e-postadresse"
          note="Bekreft endringen via e-post. Den nåværende adressen brukes til endringen er bekreftet."
        >
          <View style={{ padding: 22, gap: 16 }}>
            <TextInput
              accessibilityLabel="Ny e-postadresse"
              placeholder="navn@eksempel.no"
              placeholderTextColor={c.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              style={{
                color: c.text,
                fontSize: 17,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
                padding: 15,
              }}
            />
            <Button
              title={busy ? "Sender …" : "Send bekreftelse"}
              disabled={busy}
              onPress={async () => {
                if (
                  lock.current ||
                  !supabase ||
                  useAuthStore.getState().session?.user.id !== user.id
                )
                  return;
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                  setMessage("Skriv inn en gyldig e-postadresse.");
                  return;
                }
                if (email.trim().toLowerCase() === user.email?.toLowerCase()) {
                  setMessage("Dette er allerede e-postadressen din.");
                  return;
                }
                lock.current = true;
                setBusy(true);
                setMessage("");
                try {
                  const { error } = await supabase.auth.updateUser(
                    { email: email.trim() },
                    { emailRedirectTo: authRedirectUrl() },
                  );
                  if (error) throw error;
                  if (useAuthStore.getState().session?.user.id === user.id)
                    setMessage(
                      "Sjekk e-posten for å bekrefte endringen. Kontoen din beholdes.",
                    );
                } catch (e) {
                  setMessage(authErrorMessage(e));
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            />
          </View>
        </SettingsGroup>
      )}
      {!!message && (
        <View accessibilityLiveRegion="polite" style={{ padding: 22 }}>
          <Txt>{message}</Txt>
        </View>
      )}
      <SettingsGroup title="Profil og data">
        <SettingsRow
          title="Slett konto"
          description="Slett kontoen og tilhørende data permanent."
          onPress={() => router.push("/settings/delete-account")}
        />
        <SettingsRow
          title="Rediger profil"
          onPress={() => router.push("/edit-profile")}
        />
        <SettingsRow
          title="Personvern og deling"
          onPress={() => router.push("/settings/privacy")}
        />
        <SettingsRow
          title="Data og sikkerhetskopi"
          onPress={() => router.push("/settings/data")}
        />
      </SettingsGroup>
    </Page>
  );
}
