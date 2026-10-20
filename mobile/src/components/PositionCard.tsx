import { Linking, View } from "react-native";
import { useLiveLocation } from "../features/tracking/useLiveLocation";
import { useAppStore } from "../stores/useAppStore";
import LiveMap from "./LiveMap";
import { Button, Card, Icon, Txt, styles } from "./ui";

// Home's live map. Asks for permission only when the user taps, never on open.
export function PositionCard() {
  const loc = useLiveLocation();
  const r = useAppStore((s) => s.recording);
  const route = r.mode === "gps" && r.status !== "idle" ? r.route : [];
  if (loc.permission !== "granted")
    return (
      <Card>
        <View style={styles.row}>
          <Icon name="run" />
          <Txt weight="700" style={{ flex: 1 }}>
            Se deg selv på kartet
          </Txt>
        </View>
        <Txt muted size={14}>
          {loc.permission === "denied"
            ? "Posisjon er slått av for VYRO. Slå den på i innstillingene for å se kartet."
            : "Posisjonen brukes bare mens appen er åpen og lagres ikke."}
        </Txt>
        <Button
          title={
            loc.permission === "denied" && !loc.canAskAgain
              ? "Åpne innstillinger"
              : "Vis min posisjon"
          }
          secondary
          onPress={() => {
            if (loc.permission === "denied" && !loc.canAskAgain)
              Linking.openSettings();
            else loc.request();
          }}
        />
      </Card>
    );
  return (
    <View style={{ gap: 8 }}>
      <View style={{ borderRadius: 16, overflow: "hidden" }}>
        <LiveMap height={220} position={loc.position} route={route} follow />
      </View>
      <Txt size={12} muted>
        {loc.error ??
          (loc.position
            ? route.length
              ? "Live posisjon · økten din tegnes på kartet"
              : "Live posisjon · lagres ikke"
            : "Leter etter posisjonen din …")}
      </Txt>
    </View>
  );
}
