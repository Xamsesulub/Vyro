import { useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Screen, Txt, useTheme } from "../components/ui";
import { useAppStore } from "../stores/useAppStore";
export default function Onboarding() {
  const c = useTheme();
  const [name, setName] = useState(useAppStore.getState().name);
  return (
    <Screen
      footer={
        <Button
          title="Kom i gang"
          onPress={() => {
            useAppStore
              .getState()
              .preferences({ name: name.trim(), onboarded: true });
            router.replace("/(tabs)");
          }}
        />
      }
    >
      <Txt size={24} weight="800" style={{ color: c.accent }}>
        VYRO
      </Txt>
      <View style={{ paddingTop: 70, gap: 20 }}>
        <Txt size={36} weight="700">
          Plass til din neste tur.
        </Txt>
        <Txt muted>Registrer aktiviteter og følg fremgangen din.</Txt>
      </View>
      <Txt size={14} weight="600">
        Navn (valgfritt)
      </Txt>
      <TextInput
        accessibilityLabel="Fornavn (valgfritt)"
        value={name}
        onChangeText={setName}
        maxLength={30}
        placeholder="Ditt navn"
        placeholderTextColor={c.muted}
        style={{
          padding: 16,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          fontSize: 18,
          color: c.text,
        }}
      />
      <Txt size={13} muted>
        Dette er en forhåndsvisning med simulerte økter. Ingen GPS eller konto
        aktiveres.
      </Txt>
    </Screen>
  );
}
