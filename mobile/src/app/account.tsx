import { useState } from "react";
import { TextInput } from "react-native";
import { router } from "expo-router";
import { Button, Screen, Txt, useTheme } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/useAuthStore";

export default function Account() {
  const c = useTheme();
  const session = useAuthStore((s) => s.session);
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: c.text,
  };
  async function submit() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = register
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { display_name: name.trim() } },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (error) throw error;
      setPassword("");
      if (data.session) router.replace("/(tabs)");
      else
        setMessage(
          "Sjekk e-posten din og bekreft kontoen. Kom deretter tilbake hit og logg inn.",
        );
    } catch (e) {
      const code = (e as { code?: string }).code;
      setMessage(
        code === "invalid_credentials"
          ? "Feil e-post eller passord."
          : code === "email_not_confirmed"
            ? "Bekreft e-postadressen før du logger inn."
            : code === "over_email_send_rate_limit"
              ? "For mange e-poster er sendt. Vent litt og prøv igjen."
              : "Kunne ikke fullføre. Kontroller opplysningene og nettforbindelsen, og prøv igjen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Button
        title="Tilbake"
        secondary
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />
      <Txt size={28} weight="700">
        {session ? "Konto" : register ? "Opprett konto" : "Logg inn"}
      </Txt>
      {!supabase && <Txt>Supabase er ikke konfigurert.</Txt>}
      {session ? (
        <>
          <Txt>{session.user.email}</Txt>
          <Button
            title={busy ? "Logger ut …" : "Logg ut"}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              const result = await supabase?.auth.signOut({ scope: "local" });
              setBusy(false);
              if (result?.error) setMessage("Kunne ikke logge ut. Prøv igjen.");
              else router.replace("/(tabs)");
            }}
          />
        </>
      ) : (
        <>
          {register && (
            <TextInput
              accessibilityLabel="Visningsnavn"
              placeholder="Navnet ditt"
              placeholderTextColor={c.muted}
              value={name}
              onChangeText={setName}
              maxLength={50}
              style={input}
            />
          )}
          <TextInput
            accessibilityLabel="E-post"
            placeholder="E-post"
            placeholderTextColor={c.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={input}
          />
          <TextInput
            accessibilityLabel="Passord"
            placeholder="Passord"
            placeholderTextColor={c.muted}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry
            autoComplete={register ? "new-password" : "current-password"}
            style={input}
          />
          {register && (
            <Txt muted size={13}>
              Minst 8 tegn i passordet. Navnet ditt blir synlig for andre
              innloggede løpere. Økter deles bare når du selv velger det.
            </Txt>
          )}
          <Button
            title={busy ? "Venter …" : register ? "Opprett konto" : "Logg inn"}
            disabled={
              !supabase ||
              busy ||
              !email.trim() ||
              password.length < (register ? 8 : 1) ||
              (register && !name.trim())
            }
            onPress={submit}
          />
          <Button
            secondary
            title={
              register ? "Har du konto? Logg inn" : "Ny her? Opprett konto"
            }
            disabled={busy}
            onPress={() => {
              setRegister(!register);
              setMessage("");
            }}
          />
        </>
      )}
      {!!message && <Txt>{message}</Txt>}
    </Screen>
  );
}
