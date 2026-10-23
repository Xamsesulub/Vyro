import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Screen, Txt, useTheme } from "../components/ui";
import { supabase } from "../lib/supabase";
import { acceptAuthSession, useAuthStore } from "../stores/useAuthStore";
import {
  AccountMode,
  authErrorMessage,
  validateAccount,
} from "../features/auth/validation";
import { authRedirectUrl } from "../features/auth/links";

export default function Account() {
  const c = useTheme();
  const { session, ready, confirmationEmail } = useAuthStore();
  const [mode, setMode] = useState<AccountMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(confirmationEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState("");
  const pending = useRef(false);
  const [message, setMessage] = useState("");
  const unconfirmed = !!confirmationEmail && confirmationEmail === email.trim();
  const register = mode === "register";
  const input = {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: c.text,
  };

  async function run(title: string, action: () => Promise<void>) {
    if (!supabase || pending.current) return;
    pending.current = true;
    setBusy(title);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if ((error as { code?: string }).code === "email_not_confirmed")
        useAuthStore.setState({ confirmationEmail: email.trim() });
      setMessage(authErrorMessage(error));
    } finally {
      pending.current = false;
      setBusy("");
    }
  }

  async function submit() {
    if (!supabase || pending.current) return;
    const validation = validateAccount({
      mode,
      name,
      email,
      password,
      confirmation,
    });
    if (validation) {
      setMessage(validation);
      return;
    }
    const client = supabase;
    await run(
      mode === "reset"
        ? "Sender lenke …"
        : register
          ? "Oppretter konto …"
          : "Logger inn …",
      async () => {
        if (mode === "reset") {
          const { error } = await client.auth.resetPasswordForEmail(
            email.trim(),
            { redirectTo: authRedirectUrl() },
          );
          if (error) throw error;
          setMessage(
            "Hvis adressen har en konto, får du en lenke for å velge nytt passord. Åpne lenken på denne enheten.",
          );
          return;
        }
        const { data, error } = register
          ? await client.auth.signUp({
              email: email.trim(),
              password,
              options: {
                data: { display_name: name.trim() },
                emailRedirectTo: authRedirectUrl(),
              },
            })
          : await client.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
        if (error) throw error;
        setPassword("");
        setConfirmation("");
        if (data.session) {
          acceptAuthSession(data.session);
          router.replace("/(tabs)");
        } else if (register) {
          useAuthStore.setState({ confirmationEmail: email.trim() });
          setMode("login");
          setMessage(
            "Du er ikke innlogget ennå. Åpne bekreftelseslenken i samme nettleser som du registrerte deg i. Sjekk også søppelpost. Har du allerede en bekreftet konto, kan du logge inn nedenfor.",
          );
        } else {
          throw new Error("Missing session after sign-in");
        }
      },
    );
  }

  function changeMode(next: AccountMode) {
    setMode(next);
    setMessage("");
    setPassword("");
    setConfirmation("");
    setVisible(false);
  }

  if (!ready)
    return (
      <Screen>
        <Txt>Laster konto …</Txt>
      </Screen>
    );

  return (
    <Screen>
      <Button
        title="Tilbake"
        secondary
        disabled={!!busy}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />
      <Txt size={28} weight="700">
        {session
          ? "Konto"
          : mode === "reset"
            ? "Glemt passord"
            : register
              ? "Opprett konto"
              : unconfirmed
                ? "Bekreft e-posten"
                : "Logg inn"}
      </Txt>
      {!supabase && (
        <Txt>Innlogging er ikke satt opp på denne enheten ennå.</Txt>
      )}
      {session ? (
        <>
          <Txt>Du er innlogget i hele VYRO.</Txt>
          <Txt>{session.user.email}</Txt>
          <Button
            title={busy || "Logg ut"}
            disabled={!!busy}
            onPress={() =>
              void run("Logger ut …", async () => {
                const result = await supabase!.auth.signOut({ scope: "local" });
                if (result.error) throw result.error;
                acceptAuthSession(null);
                useAuthStore.setState({ confirmationEmail: null });
                router.replace("/(tabs)");
              })
            }
          />
        </>
      ) : (
        <>
          {unconfirmed && mode === "login" && (
            <Txt muted>
              Venter på bekreftelse av {confirmationEmail}. Registrering alene
              logger deg ikke inn.
            </Txt>
          )}
          {register && (
            <TextInput
              accessibilityLabel="Visningsnavn"
              placeholder="Navnet ditt"
              placeholderTextColor={c.muted}
              value={name}
              onChangeText={setName}
              editable={!busy}
              maxLength={50}
              autoComplete="name"
              style={input}
            />
          )}
          <TextInput
            accessibilityLabel="E-post"
            placeholder="E-post"
            placeholderTextColor={c.muted}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
            }}
            editable={!busy}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            style={input}
          />
          {mode !== "reset" && (
            <>
              <TextInput
                accessibilityLabel="Passord"
                placeholder="Passord"
                placeholderTextColor={c.muted}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!visible}
                autoComplete={register ? "new-password" : "current-password"}
                returnKeyType={register ? "next" : "go"}
                onSubmitEditing={register ? undefined : () => void submit()}
                style={input}
              />
              {register && (
                <TextInput
                  accessibilityLabel="Bekreft passord"
                  placeholder="Gjenta passordet"
                  placeholderTextColor={c.muted}
                  value={confirmation}
                  onChangeText={setConfirmation}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!visible}
                  autoComplete="new-password"
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  style={input}
                />
              )}
              <Button
                secondary
                title={visible ? "Skjul passord" : "Vis passord"}
                disabled={!!busy}
                onPress={() => setVisible(!visible)}
              />
            </>
          )}
          {register && (
            <Txt muted size={13}>
              Minst 8 tegn i passordet. Navnet ditt blir synlig for andre
              innloggede løpere. Økter deles bare når du selv velger det.
            </Txt>
          )}
          {!!message && (
            <View accessibilityLiveRegion="polite">
              <Txt>{message}</Txt>
            </View>
          )}
          <Button
            title={
              busy ||
              (mode === "reset"
                ? "Send tilbakestillingslenke"
                : register
                  ? "Opprett konto"
                  : "Logg inn")
            }
            disabled={!supabase || !!busy}
            onPress={() => void submit()}
          />
          {unconfirmed && mode === "login" && (
            <Button
              secondary
              title="Send bekreftelsen på nytt"
              disabled={!!busy || !supabase}
              onPress={() =>
                void run("Sender bekreftelse …", async () => {
                  const { error } = await supabase!.auth.resend({
                    type: "signup",
                    email: email.trim(),
                    options: { emailRedirectTo: authRedirectUrl() },
                  });
                  if (error) throw error;
                  setMessage(
                    "Hvis kontoen trenger bekreftelse, får du en ny lenke på e-post. Åpne den på denne enheten.",
                  );
                })
              }
            />
          )}
          {mode === "login" && (
            <Button
              secondary
              title="Glemt passord?"
              disabled={!!busy}
              onPress={() => changeMode("reset")}
            />
          )}
          <Button
            secondary
            title={
              mode === "login"
                ? "Ny her? Opprett konto"
                : "Tilbake til innlogging"
            }
            disabled={!!busy}
            onPress={() => changeMode(mode === "login" ? "register" : "login")}
          />
        </>
      )}
      {!!message && !!session && (
        <View accessibilityLiveRegion="polite">
          <Txt>{message}</Txt>
        </View>
      )}
    </Screen>
  );
}
