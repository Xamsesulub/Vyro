import { Switch, View } from "react-native";
import { Chip, Txt, styles } from "../components/ui";
import { Page } from "../components/SettingsUi";
import { useAppStore } from "../stores/useAppStore";
import { BackgroundRecordingSetting } from "../components/BackgroundRecordingSetting";
import { liveActivitySupported } from "../features/tracking/liveActivitySupport";
import { useTrackingStatus } from "../stores/useTrackingStatus";

export default function TrainingSettings() {
  const alerts = useAppStore((s) => s.kilometerAlerts);
  const awake = useAppStore((s) => s.keepWorkoutAwake);
  const liveActivity = useAppStore((s) => s.workoutLiveActivity);
  const liveError = useTrackingStatus((s) => s.liveActivityError);
  const preferences = useAppStore((s) => s.preferences);
  const recording = useAppStore((s) => s.recording.status !== "idle");
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
            Tale og vibrasjon avhenger av telefonens lydinnstillinger og støtte.
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
            Kart på låseskjermen
          </Txt>
          {liveActivitySupported ? (
            <>
              <View style={styles.row}>
                <Txt style={{ flex: 1 }}>Vis kart og økttall</Txt>
                <Switch
                  accessibilityLabel="Vis kart og økttall"
                  value={liveActivity}
                  disabled={recording}
                  onValueChange={(workoutLiveActivity) =>
                    preferences({
                      workoutLiveActivity,
                      ...(workoutLiveActivity
                        ? { backgroundRecording: true }
                        : {}),
                    })
                  }
                />
              </View>
              <Txt muted size={14}>
                {recording
                  ? "Avslutt økten før du endrer låseskjermvisningen."
                  : "Viser siste kartutsnitt, tid og distanse under GPS-økten. Slår også på opptak med låst skjerm. Kartet og posisjonen blir synlige på låseskjermen."}
              </Txt>
              {liveError && <Txt size={14}>{liveError}</Txt>}
            </>
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
