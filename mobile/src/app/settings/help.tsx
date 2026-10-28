import { useState } from "react";
import { View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
  Page,
  PageNote,
  SettingsGroup,
  SettingsRow,
} from "../../components/SettingsUi";
import { Txt } from "../../components/ui";
const questions = [
  [
    "Virker opptak med låst skjerm?",
    "I VYROs egen installasjon kan GPS fortsette med låst skjerm og i andre apper når bakgrunnsopptak er på og posisjonstilgang er satt til Alltid og Presis posisjon. Expo Go og nettleseren må holdes åpne. En helt avslått telefon kan ikke registrere GPS.",
  ],
  [
    "Hvordan beregnes snittempo?",
    "Aktiv tid deles på den målte distansen. Pauser teller ikke. Det brukes full GPS-presisjon i beregningen selv om kilometer vises med to desimaler. Står du stille uten å pause, fortsetter tiden.",
  ],
  [
    "Hvor finner jeg øktene mine?",
    "Åpne Du → Aktiviteter for dine egne økter. Ved bytte av telefon kan du hente økter som du har aktivert privat sikkerhetskopiering for.",
  ],
  [
    "Hvorfor er Hjem tom?",
    "Hjem viser det du og personene du følger har delt. En lagret økt publiseres ikke automatisk. Finn venner, eller del din egen fullførte økt.",
  ],
  [
    "Hvordan fjerner jeg et innlegg?",
    "Åpne innlegget på Hjem og velg å trekke det tilbake. Den private økten i treningsloggen beholdes. Du administrerer sikkerhetskopier separat under Data og sikkerhetskopi.",
  ],
  [
    "Hvordan fungerer soner?",
    "Du kan opprette en sone fra en kvalifisert GPS-rute og konkurrere på den. Bare godkjente GPS-opptak teller i konkurransen.",
  ],
] as const;
export default function Help() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Page title="Hjelp og om VYRO">
      <SettingsGroup title="Vanlige spørsmål">
        {questions.map(([question, answer], i) => (
          <View key={question}>
            <SettingsRow
              title={question}
              onPress={() => setOpen(open === i ? null : i)}
              value={open === i ? "−" : "+"}
            />
            {open === i && (
              <View style={{ padding: 22, paddingTop: 8 }}>
                <Txt muted size={14}>
                  {answer}
                </Txt>
              </View>
            )}
          </View>
        ))}
      </SettingsGroup>
      <SettingsGroup title="Snarveier">
        <SettingsRow
          title="GPS og opptaksinnstillinger"
          onPress={() => router.push("/training-settings")}
        />
        <SettingsRow
          title="Personvern og deling"
          onPress={() => router.push("/settings/privacy")}
        />
        <SettingsRow
          title="Apple Watch"
          onPress={() => router.push("/apple-watch")}
        />
      </SettingsGroup>
      <PageNote>
        VYRO {Constants.expoConfig?.version ?? "0.1.0"}
        {"\n"}Et sted for turene dine, menneskene du følger og løypene du vil
        tilbake til.
      </PageNote>
    </Page>
  );
}
