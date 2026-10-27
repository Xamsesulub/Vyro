import { Switch, View } from "react-native";
import { Txt, styles } from "./ui";
import { useAppStore } from "../stores/useAppStore";
import { useTrackingStatus } from "../stores/useTrackingStatus";
import { liveActivitySupported } from "../features/tracking/liveActivitySupport";

export function WorkoutLockScreenSetting() {
  const enabled = useAppStore((s) => s.workoutLiveActivity);
  const background = useAppStore((s) => s.backgroundRecording);
  const recording = useAppStore((s) => s.recording.status !== "idle");
  const preferences = useAppStore((s) => s.preferences);
  const error = useTrackingStatus((s) => s.liveActivityError);
  if (!liveActivitySupported) return null;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row}>
        <Txt style={{ flex: 1 }}>Vis tid og km på låseskjermen</Txt>
        <Switch
          accessibilityLabel="Vis tid og km på låseskjermen"
          value={enabled && background}
          disabled={recording && !background}
          onValueChange={(workoutLiveActivity) =>
            preferences({
              workoutLiveActivity,
              ...(workoutLiveActivity && !recording
                ? { backgroundRecording: true }
                : {}),
            })
          }
        />
      </View>
      <Txt muted size={14}>
        {recording && !background
          ? "Avslutt økten og slå på opptak med låst skjerm for å vise økten."
          : !background && enabled
            ? "Valget ditt huskes. Slå på opptak med låst skjerm for å bruke det igjen."
            : "Tid, distanse og siste kartutsnitt blir synlige når telefonen er låst."}
      </Txt>
      {error && <Txt size={14}>{error}</Txt>}
    </View>
  );
}
