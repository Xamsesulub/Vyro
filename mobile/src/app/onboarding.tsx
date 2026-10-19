import { useState } from "react";
import { View, TextInput } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Chip,
  Logo,
  Screen,
  Txt,
  styles,
  useTheme,
} from "../components/ui";
import { RouteArt } from "../components/RouteArt";
import { Sport, sports } from "../features/activities/model";
import { useAppStore } from "../stores/useAppStore";
import { brand } from "../theme/tokens";

export default function Onboarding() {
  const s = useAppStore();
  const c = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(s.name);
  const [selected, setSelected] = useState<Sport[]>(s.preferred);
  const [goal, setGoal] = useState(s.goal);
  const [level, setLevel] = useState(s.experience);
  function finish() {
    s.preferences({
      name: name.trim(),
      preferred: selected,
      goal,
      experience: level,
      onboarded: true,
    });
    router.replace("/(tabs)");
  }
  return (
    <Screen>
      <View style={styles.row}>
        <Logo />
        <Badge text="Visuell prototype" />
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 4,
              backgroundColor: i <= step ? brand.lime : c.border,
            }}
          />
        ))}
      </View>
      {step === 0 && (
        <>
          <View style={{ borderRadius: 28, overflow: "hidden" }}>
            <RouteArt height={260} />
          </View>
          <Txt size={46} weight="800" style={{ letterSpacing: -2 }}>
            Every move{"\n"}moves you{"\n"}forward.
          </Txt>
          <Txt muted size={17}>
            Din rytme. Dine mål. Ditt neste steg. Velkommen til VYRO.
          </Txt>
          <Button
            title="Finn din bevegelse"
            icon="arrow"
            onPress={() => setStep(1)}
          />
          <Button title="Utforsk med standardvalg" secondary onPress={finish} />
        </>
      )}
      {step === 1 && (
        <>
          <Txt size={36} weight="700">
            Hva får deg{"\n"}ut døra?
          </Txt>
          <Txt muted>
            Velg aktivitetene du liker. Du kan endre dette senere.
          </Txt>
          {sports.map((sport) => (
            <Chip
              key={sport}
              title={sport}
              selected={selected.includes(sport)}
              onPress={() =>
                setSelected(
                  selected.includes(sport)
                    ? selected.filter((x) => x !== sport)
                    : [...selected, sport],
                )
              }
            />
          ))}
          <Button title="Fortsett" icon="arrow" onPress={() => setStep(2)} />
        </>
      )}
      {step === 2 && (
        <>
          <Txt size={36} weight="700">
            Litt bevegelse.{"\n"}Store muligheter.
          </Txt>
          <Txt muted>
            Et ukemål som passer livet ditt. Alle aktivitetstyper teller i
            distansen.
          </Txt>
          <Card>
            <Txt weight="600">Kilometer per uke</Txt>
            <View style={styles.wrap}>
              {[10, 20, 30, 50].map((n) => (
                <Chip
                  key={n}
                  title={`${n} km`}
                  selected={goal === n}
                  onPress={() => setGoal(n)}
                />
              ))}
            </View>
          </Card>
          <Card>
            <Txt weight="600">Din erfaring</Txt>
            <View style={styles.wrap}>
              {["Nybegynner", "Litt erfaring", "Godt i gang"].map((v) => (
                <Chip
                  key={v}
                  title={v}
                  selected={level === v}
                  onPress={() => setLevel(v)}
                />
              ))}
            </View>
          </Card>
          <Button title="Fortsett" icon="arrow" onPress={() => setStep(3)} />
        </>
      )}
      {step === 3 && (
        <>
          <Txt size={36} weight="700">
            Gjør VYRO{"\n"}til ditt.
          </Txt>
          <Txt muted>
            Hva skal vi kalle deg? Dette er valgfritt og lagres kun på denne
            enheten.
          </Txt>
          <TextInput
            accessibilityLabel="Fornavn (valgfritt)"
            value={name}
            onChangeText={setName}
            maxLength={30}
            placeholder="Ditt fornavn"
            placeholderTextColor={c.muted}
            style={{
              color: c.text,
              backgroundColor: c.raised,
              padding: 18,
              borderRadius: 16,
              fontSize: 18,
            }}
          />
          <Card>
            <Badge text="Du har kontroll" />
            <Txt weight="600">Privat fra første steg</Txt>
            <Txt muted size={14}>
              Prototypen bruker simulerte treningsdata. Ingen GPS, konto eller
              varsling aktiveres. Innlogging kommer med Supabase i neste fase.
            </Txt>
          </Card>
          <Button title="La oss komme i gang" icon="arrow" onPress={finish} />
        </>
      )}
      {step > 0 && (
        <Button title="Tilbake" secondary onPress={() => setStep(step - 1)} />
      )}
    </Screen>
  );
}
