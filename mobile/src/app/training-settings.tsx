import { Switch, View } from "react-native";
import { router } from "expo-router";
import { Button, Chip, Screen, Txt, styles } from "../components/ui";
import { useAppStore } from "../stores/useAppStore";
import { backgroundSupported } from "../features/tracking/background";

export default function TrainingSettings() {
  const alerts = useAppStore((s) => s.kilometerAlerts);
  const background = useAppStore((s) => s.backgroundRecording);
  const preferences = useAppStore((s) => s.preferences);
  const recording = useAppStore((s) => s.recording.status !== "idle");
  return (
    <Screen>
      <Button
        title="Tilbake til innstillinger"
        secondary
        onPress={() => router.replace("/settings")}
      />
      <Txt size={28} weight="700">
        Varsler og opptak
      </Txt>
      <View style={{ gap: 12 }}>
        <Txt size={20} weight="700">
          Kilometervarsler
        </Txt>
        <Txt muted size={14}>
          Velg om du vil høre eller kjenne et varsel for hver kilometer under en
          GPS-økt.
        </Txt>
        <View style={styles.wrap}>
          {(
            [
              ["off", "Av"],
              ["voice", "Tale"],
              ["vibration", "Vibrasjon"],
            ] as const
          ).map(([value, title]) => (
            <Chip
              key={value}
              title={title}
              selected={alerts === value}
              onPress={() => preferences({ kilometerAlerts: value })}
            />
          ))}
        </View>
        <Txt size={12} muted>
          Tale og vibrasjon avhenger av telefonens lydinnstillinger og støtte.
        </Txt>
      </View>
      <View style={{ gap: 12 }}>
        <Txt size={20} weight="700">
          Opptak med låst skjerm
        </Txt>
        {backgroundSupported ? (
          <>
            <View style={styles.row}>
              <Txt style={{ flex: 1 }}>Fortsett med låst skjerm</Txt>
              <Switch
                accessibilityLabel="Fortsett med låst skjerm"
                value={background}
                disabled={recording}
                onValueChange={(backgroundRecording) =>
                  preferences({ backgroundRecording })
                }
              />
            </View>
            <Txt muted size={14}>
              {recording
                ? "Avslutt økten før du endrer bakgrunnsopptak."
                : "Krever posisjonstilgang i bakgrunnen. GPS brukes fra du starter til du pauser eller avslutter økten."}
            </Txt>
          </>
        ) : (
          <Txt muted size={14}>
            Bakgrunnsopptak er tilgjengelig i mobilappen. I nettleseren må appen
            være åpen under økten.
          </Txt>
        )}
      </View>
    </Screen>
  );
}
