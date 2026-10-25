import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { acceptAuthSession, useAuthStore } from "../stores/useAuthStore";
import { authErrorMessage } from "../features/auth/validation";
import { Button, Txt, useTheme } from "./ui";

// Mount with key=user.id so a different account cannot inherit this private draft.
export function AccountLastName({ user }: { user: User }) {
  const c = useTheme();
  const current =
    typeof user.user_metadata?.last_name === "string"
      ? user.user_metadata.last_name
      : "";
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const value = draft ?? current;
  async function save() {
    if (!supabase || pending.current || value.trim().length > 50) return;
    if (useAuthStore.getState().session?.user.id !== user.id) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { last_name: value.trim() || null },
      });
      if (error) throw error;
      const session = useAuthStore.getState().session;
      if (!session || session.user.id !== user.id || data.user.id !== user.id)
        return;
      acceptAuthSession({ ...session, user: data.user });
      setDraft(null);
      setMessage("Etternavnet er lagret.");
    } catch (error) {
      if (useAuthStore.getState().session?.user.id === user.id)
        setMessage(authErrorMessage(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Txt weight="600">Etternavn (valgfritt)</Txt>
      <TextInput
        accessibilityLabel="Etternavn (valgfritt)"
        placeholder="Etternavn"
        placeholderTextColor={c.muted}
        value={value}
        onChangeText={(text) => {
          setDraft(text);
          setMessage("");
        }}
        maxLength={50}
        autoComplete="family-name"
        autoCapitalize="words"
        editable={!busy}
        style={{
          color: c.text,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 16,
          fontSize: 16,
        }}
      />
      <Txt muted size={13}>
        Privat kontoinformasjon. Bare visningsnavnet du velger i Innstillinger
        vises til andre.
      </Txt>
      <Button
        secondary
        title={busy ? "Lagrer etternavn …" : "Lagre etternavn"}
        disabled={busy || value.trim() === current || !supabase}
        onPress={() => void save()}
      />
      {!!message && <Txt>{message}</Txt>}
    </View>
  );
}
