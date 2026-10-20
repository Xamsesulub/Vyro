import { Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Screen, Txt, styles, useTheme } from "../components/ui";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";
export default function Settings() {
  const s = useAppStore();
  const c = useTheme();
  const session = useAuthStore((s) => s.session);
  return (
    <Screen>
      <Button
        title="Tilbake til profil"
        secondary
        onPress={() => router.replace("/profile")}
      />
      <Txt size={28} weight="700">
        Innstillinger
      </Txt>
      <Button
        title={session ? "Konto og utlogging" : "Logg inn eller opprett konto"}
        onPress={() => router.push("/account")}
      />
      <Txt weight="600">Lokalt visningsnavn</Txt>
      <TextInput
        accessibilityLabel="Endre fornavn"
        value={s.name}
        onChangeText={(name) => s.preferences({ name })}
        maxLength={30}
        placeholder="Ditt navn"
        placeholderTextColor={c.muted}
        style={{
          fontSize: 18,
          color: c.text,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderColor: c.border,
        }}
      />
      <View style={styles.row}>
        <Txt>Mørkt utseende</Txt>
        <Switch
          accessibilityLabel="Mørkt utseende"
          value={s.theme === "dark"}
          onValueChange={(dark) =>
            s.preferences({ theme: dark ? "dark" : "light" })
          }
        />
      </View>
      <View style={styles.row}>
        <Txt>Vis eksempeløkter</Txt>
        <Switch
          accessibilityLabel="Vis eksempeløkter"
          value={s.examplesVisible}
          onValueChange={(examplesVisible) =>
            s.preferences({ examplesVisible })
          }
        />
      </View>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.border,
          paddingTop: 24,
          gap: 10,
        }}
      >
        <Txt weight="600">Personvern</Txt>
        <Txt muted size={14}>
          Økter lagres privat på denne enheten. Når du publiserer en økt, lastes
          kartet og målingene opp og blir synlige for innloggede VYRO-brukere.
          Du kan trekke tilbake innlegget fra Hjem.
        </Txt>
      </View>
    </Screen>
  );
}
