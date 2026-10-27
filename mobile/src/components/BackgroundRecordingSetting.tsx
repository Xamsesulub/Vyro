import { useState } from "react";
import { Linking, Platform, Switch, View } from "react-native";
import { Button, Txt, styles } from "./ui";
import { useAppStore } from "../stores/useAppStore";
import { backgroundSupported } from "../features/tracking/background";
import { WorkoutLockScreenSetting } from "./WorkoutLockScreenSetting";

export function BackgroundRecordingSetting({
  compact = false,
}: {
  compact?: boolean;
}) {
  const enabled = useAppStore((s) => s.backgroundRecording);
  const recording = useAppStore((s) => s.recording.status !== "idle");
  const preferences = useAppStore((s) => s.preferences);
  const [settingsError, setSettingsError] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row}>
        <Txt weight="700" style={{ flex: 1 }}>
          Fortsett med låst skjerm
        </Txt>
        {backgroundSupported && (
          <Switch
            accessibilityLabel="Fortsett med låst skjerm"
            value={enabled}
            disabled={recording}
            onValueChange={(backgroundRecording) =>
              // Keep the separate map preference so off/on restores the user's
              // choice. The Live Activity observer gates it on background mode.
              preferences({ backgroundRecording })
            }
          />
        )}
      </View>
      <Txt muted size={14}>
        {backgroundSupported
          ? recording
            ? "Avslutt økten før du endrer dette valget."
            : enabled
              ? "Registrer turen med skjermen låst eller mens du bruker andre apper. Start økten før du låser telefonen."
              : "Økten pauses hvis du låser skjermen eller bytter app."
          : Platform.OS === "web"
            ? "I nettleseren må VYRO være åpen under hele økten."
            : "Expo Go pauser opptaket når skjermen låses eller du bytter app. Dette krever en egen installasjon av VYRO, for eksempel via TestFlight."}
      </Txt>
      {compact && backgroundSupported && enabled && (
        <WorkoutLockScreenSetting />
      )}
      {backgroundSupported && enabled && !recording && !compact && (
        <>
          <Button
            title="Åpne posisjonsinnstillinger"
            secondary
            onPress={() => {
              setSettingsError(false);
              void Linking.openSettings().catch(() => setSettingsError(true));
            }}
          />
          <Txt muted size={12}>
            {Platform.OS === "ios"
              ? "Velg VYRO → Posisjon → Når appen er i bruk (eller Alltid), og slå på Presis posisjon."
              : "Velg VYRO → Posisjon → Alltid og slå på Presis posisjon."}{" "}
            Telefonen må være på; ikke avslutt VYRO fra appveksleren.
          </Txt>
          {settingsError && (
            <Txt size={12}>Åpne Innstillinger på telefonen og finn VYRO.</Txt>
          )}
        </>
      )}
    </View>
  );
}
