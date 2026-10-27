import { useEffect, useRef, useState } from "react";
import { Switch, View } from "react-native";
import { Button, Chip, Txt, styles } from "../components/ui";
import { Page } from "../components/SettingsUi";
import { useAppStore } from "../stores/useAppStore";
import { BackgroundRecordingSetting } from "../components/BackgroundRecordingSetting";
import { WorkoutLockScreenSetting } from "../components/WorkoutLockScreenSetting";
import { liveActivitySupported } from "../features/tracking/liveActivitySupport";
import { useTrackingStatus } from "../stores/useTrackingStatus";
import {
  playWorkoutAlert,
  stopWorkoutSpeech,
} from "../features/tracking/alerts";

export default function TrainingSettings() {
  const alerts = useAppStore((s) => s.kilometerAlerts);
  const awake = useAppStore((s) => s.keepWorkoutAwake);
  const preferences = useAppStore((s) => s.preferences);
  const recording = useAppStore((s) => s.recording.status !== "idle");
  const alertError = useTrackingStatus((s) => s.alertError);
  const [preview, setPreview] = useState("");
  const [testing, setTesting] = useState(false);
  const mounted = useRef(true);
  const previewPending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void stopWorkoutSpeech();
    };
  }, []);
  async function testAlert(mode: "voice" | "vibration") {
    if (previewPending.current || recording) return;
    previewPending.current = true;
    setTesting(true);
    setPreview("");
    useTrackingStatus.setState({ alertError: null });
    try {
      await playWorkoutAlert(mode, undefined, () => mounted.current);
      if (mounted.current)
        setPreview(
          mode === "voice"
            ? "Prøvevarsel sendt. Hørte du stemmen?"
            : "Prøvevarsel sendt. Kjente du vibrasjonen?",
        );
    } catch {
      if (mounted.current)
        useTrackingStatus.setState({
          alertError: "Kunne ikke spille av prøvevarselet.",
        });
    } finally {
      previewPending.current = false;
      if (mounted.current) setTesting(false);
    }
  }
  return (
    <Page title="Varsler og opptak">
      <View style={{ padding: 22, gap: 28 }}>
        <View style={{ gap: 12 }}>
          <Txt size={20} weight="700">
            Kilometervarsler
          </Txt>
          <Txt muted size={14}>
            Velg om du vil høre eller kjenne et varsel for hver kilometer under
            en GPS-økt.
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
            Tale krever at stillemodus er av og volumet er på. Vibrasjon kan
            utebli i spareblussmodus eller når haptikk er slått av. Prøv på
            telefonen.
          </Txt>
          <Button
            title="Prøv tale"
            secondary
            disabled={testing || recording}
            onPress={() => void testAlert("voice")}
          />
          <Button
            title="Prøv vibrasjon"
            secondary
            disabled={testing || recording}
            onPress={() => void testAlert("vibration")}
          />
          {recording && (
            <Txt muted size={12}>
              Prøv varsler når økten er avsluttet.
            </Txt>
          )}
          {!!(alertError || preview) && (
            <Txt size={14} accessibilityRole={alertError ? "alert" : undefined}>
              {alertError || preview}
            </Txt>
          )}
          <Txt muted size={12}>
            Prøv også en økt med låst skjerm. iOS kan begrense tale og vibrasjon
            i bakgrunnen.
          </Txt>
        </View>
        <View style={{ gap: 12 }}>
          <Txt size={20} weight="700">
            Skjerm under økten
          </Txt>
          <View style={styles.row}>
            <Txt style={{ flex: 1 }}>Hold treningskartet på</Txt>
            <Switch
              accessibilityLabel="Hold treningskartet på"
              value={awake}
              onValueChange={(keepWorkoutAwake) =>
                preferences({ keepWorkoutAwake })
              }
            />
          </View>
          <Txt muted size={14}>
            Hindrer automatisk skjermlås i Tren og Kart mens økten pågår eller
            er pauset. Du kan fortsatt låse telefonen selv.
          </Txt>
        </View>
        <BackgroundRecordingSetting />
        <View style={{ gap: 12 }}>
          <Txt size={20} weight="700">
            Økten på låseskjermen
          </Txt>
          {liveActivitySupported ? (
            <WorkoutLockScreenSetting />
          ) : (
            <Txt muted size={14}>
              Krever et nytt VYRO-bygg for iPhone med Liveaktiviteter. Visningen
              er ikke tilgjengelig i Expo Go eller nettleseren.
            </Txt>
          )}
        </View>
      </View>
    </Page>
  );
}
