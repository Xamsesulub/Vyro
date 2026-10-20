import { useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Header,
  Icon,
  Metric,
  Screen,
  Txt,
  styles,
  useTheme,
} from "../components/ui";

import LiveMap from "../components/LiveMap";
import { useAppStore } from "../stores/useAppStore";
import { duration, km, pace } from "../features/activities/model";
import { useAuthStore } from "../stores/useAuthStore";
import { FinishStamp, Reveal } from "../components/motion";
export default function Summary() {
  const s = useAppStore();
  const c = useTheme();
  const r = s.recording;
  const userId = useAuthStore((s) => s.session?.user.id);
  const [title, setTitle] = useState(`Min ${r.sport.toLowerCase()}`);
  const [notes, setNotes] = useState("");
  const [discard, setDiscard] = useState(false);
  const input = {
    color: c.text,
    backgroundColor: c.raised,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
  };
  if (r.status !== "finishing" || (r.ownerId && r.ownerId !== userId))
    return (
      <Screen>
        <Header eyebrow="Øktoppsummering" title="Ingen avsluttet økt" />
        <Button
          title="Til treningen"
          onPress={() => router.replace("/(tabs)/track")}
        />
      </Screen>
    );
  return (
    <Screen>
      <Reveal>
        <View style={{ gap: 18 }}>
          <FinishStamp />
          <View style={{ gap: 6 }}>
            <Txt muted size={11} weight="600" style={{ letterSpacing: 2 }}>
              ØKTOPPSUMMERING
            </Txt>
            <Txt size={36} weight="800" style={{ letterSpacing: -1.2 }}>
              {r.mode === "gps" ? "En tur videre." : "Simulering fullført."}
            </Txt>
            <Txt muted>Ta et pust. Her er økten din.</Txt>
          </View>
        </View>
      </Reveal>
      <Badge
        text={
          r.mode === "gps"
            ? "GPS-økt · privat"
            : "Simulert økt · ikke et GPS-opptak"
        }
      />
      {r.mode === "gps" && r.route.flat().length > 1 && (
        <View style={{ borderRadius: 16, overflow: "hidden" }}>
          <LiveMap height={200} route={r.route} />
        </View>
      )}
      <Card>
        <View style={styles.row}>
          <Metric value={km(r.distance)} label="kilometer" />
          <Metric value={duration(r.seconds)} label="aktiv tid" />
        </View>
        <View style={styles.row}>
          <Metric value={pace(r.distance, r.seconds)} label="snitt min/km" />
          <Metric
            value={
              r.seconds > 0 ? ((r.distance / r.seconds) * 3600).toFixed(1) : "—"
            }
            label="snitt km/t"
          />
        </View>
      </Card>
      <TextInput
        accessibilityLabel="Navn på økten"
        maxLength={80}
        value={title}
        onChangeText={setTitle}
        style={input}
      />
      <TextInput
        accessibilityLabel="Notater om økten"
        maxLength={1000}
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Hvordan føltes det? (valgfritt)"
        placeholderTextColor={c.muted}
        style={[input, { minHeight: 90, textAlignVertical: "top" }]}
      />
      <View style={styles.row}>
        <Icon name="lock" size={18} />
        <Txt size={12} muted style={{ flex: 1 }}>
          {r.mode === "gps"
            ? "Privat · kart, tid og distanse lagres på denne enheten. Du velger selv om økten skal deles."
            : "Privat · lagres på denne enheten · ingen opplasting"}
        </Txt>
      </View>
      <Button
        title={r.mode === "gps" ? "Lagre økten" : "Lagre simulert økt"}
        disabled={
          r.seconds < 1 ||
          (r.mode === "gps" && (r.route.flat().length < 2 || r.distance <= 0))
        }
        icon="check"
        onPress={() => {
          const id = s.save(title, notes);
          if (id)
            router.replace({ pathname: "/activity/[id]", params: { id } });
        }}
      />
      {r.seconds < 1 && (
        <Txt muted size={12}>
          Økten er for kort til å lagres.
        </Txt>
      )}
      <Button
        title={discard ? "Bekreft: forkast økten" : "Forkast økten"}
        secondary={!discard}
        danger={discard}
        onPress={() => {
          if (!discard) setDiscard(true);
          else {
            s.event("discard");
            router.replace("/(tabs)/track");
          }
        }}
      />
      {discard && (
        <Button
          title="Behold økten"
          secondary
          onPress={() => setDiscard(false)}
        />
      )}
    </Screen>
  );
}
