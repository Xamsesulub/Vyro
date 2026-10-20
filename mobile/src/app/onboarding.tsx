import { useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Screen, Txt, useTheme, Logo } from "../components/ui";
import { MovementLine, Reveal } from "../components/motion";
import { useAppStore } from "../stores/useAppStore";
export default function Onboarding() {
  const c = useTheme();
  const [name, setName] = useState(useAppStore.getState().name);
  return (
    <Screen
      footer={
        <Button
          title="Kom i gang"
          icon="arrow"
          onPress={() => {
            useAppStore
              .getState()
              .preferences({ name: name.trim(), onboarded: true });
            router.replace("/(tabs)");
          }}
        />
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo small color={c.text} />
        <Txt size={10} muted weight="600" style={{ letterSpacing: 2 }}>
          MOVE BEYOND
        </Txt>
      </View>
      <Reveal>
        <View style={{ paddingTop: 16, gap: 16 }}>
          <Txt
            size={48}
            weight="800"
            style={{ letterSpacing: -2, lineHeight: 51 }}
          >
            Ut døra.{"\n"}Litt videre.
          </Txt>
          <Txt muted>
            Finn din rytme. Ta vare på turene.{"\n"}Del dem med folkene dine.
          </Txt>
        </View>
      </Reveal>
      <MovementLine />
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
          borderRadius: 14,
          fontSize: 18,
          color: c.text,
        }}
      />
      <Txt size={13} muted>
        Ingen konto eller GPS aktiveres her. Du velger selv når du vil
        registrere deg eller starte et opptak.
      </Txt>
    </Screen>
  );
}
