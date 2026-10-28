import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Chip,
  Icon,
  Screen,
  Txt,
  styles,
  useTheme,
} from "../components/ui";
import LiveMap from "../components/LiveMap";
import FootballMap from "../components/FootballMap";
import WorkoutStats from "../components/WorkoutStats";
import { storedRoute } from "../features/tracking/gps";
import { footballMaxSpeed } from "../features/football/speed";
import { workoutTypes, type WorkoutType } from "../features/activities/sports";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";

export default function Summary() {
  const r = useAppStore((s) => s.recording);
  const save = useAppStore((s) => s.save);
  const event = useAppStore((s) => s.event);
  const c = useTheme();
  const route = useMemo(() => storedRoute(r.route), [r.route]);
  const maxSpeed = useMemo(
    () =>
      r.mode === "gps" && r.sport === "Fotball"
        ? footballMaxSpeed(r.turfTrace ?? [])
        : undefined,
    [r.mode, r.sport, r.turfTrace],
  );
  const userId = useAuthStore((s) => s.session?.user.id);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [workoutType, setType] = useState<WorkoutType>("Vanlig økt");
  const [effort, setEffort] = useState<number>();
  const [openType, setOpenType] = useState(false);
  const [openEffort, setOpenEffort] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [saveError, setSaveError] = useState("");
  const input = {
    color: c.text,
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
  };
  const valid =
    r.seconds >= 1 &&
    (r.mode !== "gps" || (route.length >= 2 && r.distance > 0));
  if (r.status !== "finishing" || (r.ownerId && r.ownerId !== userId))
    return (
      <Screen>
        <Txt size={24} weight="700">
          Ingen avsluttet økt
        </Txt>
        <Button
          title="Til treningen"
          onPress={() => router.replace("/(tabs)/track")}
        />
      </Screen>
    );
  return (
    <Screen
      footer={
        discard ? (
          <>
            <Txt weight="700" accessibilityRole="alert">
              Forkaste økten uten å lagre?
            </Txt>
            <Button
              title="Bekreft: forkast økten"
              danger
              onPress={() => {
                event("discard");
                router.replace("/(tabs)/track");
              }}
            />
            <Button
              title="Behold økten"
              secondary
              onPress={() => setDiscard(false)}
            />
          </>
        ) : (
          <>
            {!valid && (
              <Txt muted size={13}>
                {r.seconds < 1
                  ? "Økten er for kort til å lagres."
                  : "Ingen GPS-strekning ble registrert. Fortsett økten og vent på posisjon."}
              </Txt>
            )}
            {!!saveError && (
              <Txt accessibilityRole="alert" size={13}>
                {saveError}
              </Txt>
            )}
            <Button
              title="Lagre økten"
              icon="check"
              large
              disabled={!valid}
              onPress={() => {
                const id = save(title, notes, { workoutType, effort });
                if (id)
                  router.replace({
                    pathname: "/activity/[id]",
                    params: { id },
                  });
                else
                  setSaveError(
                    "Økten kunne ikke lagres. Kontroller at du er innlogget med samme konto.",
                  );
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setDiscard(true)}
              style={{
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Txt weight="600" style={{ color: c.text }}>
                Forkast økten
              </Txt>
            </Pressable>
          </>
        )
      }
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            event("return");
            router.replace("/(tabs)/track");
          }}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Txt style={{ color: c.accent }}>Tilbake</Txt>
        </Pressable>
        <Txt size={22} weight="700">
          Lagre aktivitet
        </Txt>
        <Icon name="lock" size={20} color={c.muted} />
      </View>
      <View style={{ gap: 6 }}>
        <Txt size={14} muted>
          {r.sport} · {new Date().toLocaleDateString("nb-NO")}
        </Txt>
        <WorkoutStats
          sport={r.sport}
          seconds={r.seconds}
          distance={r.distance}
          timerOnly={r.mode === "timer"}
          maxSpeed={maxSpeed}
        />
      </View>
      {r.mode === "gps" && route.length > 1 && (
        <View style={{ borderRadius: 18, overflow: "hidden" }}>
          {r.sport === "Fotball" ? (
            <FootballMap points={route} />
          ) : (
            <LiveMap height={180} route={r.route} />
          )}
        </View>
      )}
      <View style={{ gap: 8 }}>
        <Txt weight="600">Navn på økten</Txt>
        <TextInput
          accessibilityLabel="Navn på økten"
          maxLength={80}
          value={title}
          onChangeText={setTitle}
          placeholder={`${r.sport} i dag`}
          placeholderTextColor={c.muted}
          style={input}
        />
      </View>
      <View style={{ gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: openType }}
          onPress={() => setOpenType(!openType)}
          style={[input, styles.row]}
        >
          <View style={{ gap: 4 }}>
            <Txt muted size={12}>
              Type økt
            </Txt>
            <Txt weight="600">{workoutType}</Txt>
          </View>
          <Icon name={openType ? "chevronUp" : "chevronDown"} color={c.muted} />
        </Pressable>
        {openType && (
          <View style={styles.wrap}>
            {workoutTypes.map((type) => (
              <Chip
                key={type}
                title={type}
                selected={type === workoutType}
                onPress={() => {
                  setType(type);
                  setOpenType(false);
                }}
              />
            ))}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: openEffort }}
          onPress={() => setOpenEffort(!openEffort)}
          style={[input, styles.row]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Txt muted size={12}>
              Hvordan føltes aktiviteten?
            </Txt>
            <Txt weight="600">
              {effort
                ? `Anstrengelse: ${effort} av 10`
                : "Velg anstrengelse (valgfritt)"}
            </Txt>
          </View>
          <Icon
            name={openEffort ? "chevronUp" : "chevronDown"}
            color={c.muted}
          />
        </Pressable>
        {openEffort && (
          <View style={{ gap: 10 }}>
            <Txt muted size={13}>
              1 er svært lett · 10 er maksimal innsats
            </Txt>
            <View style={styles.wrap}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Chip
                  key={n}
                  title={String(n)}
                  selected={effort === n}
                  onPress={() => setEffort(effort === n ? undefined : n)}
                />
              ))}
            </View>
          </View>
        )}
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="lock" size={16} color={c.muted} />
          <Txt weight="600">Private notater</Txt>
        </View>
        <TextInput
          accessibilityLabel="Notater om økten"
          maxLength={1000}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Skriv noe du vil huske fra økten …"
          placeholderTextColor={c.muted}
          style={[input, { minHeight: 100, textAlignVertical: "top" }]}
        />
      </View>
      <Card>
        <View style={styles.row}>
          <Txt weight="700">Synlighet</Txt>
          <Txt>Kun deg</Txt>
        </View>
        <Txt muted size={13}>
          Økten lagres privat. Du kan dele den etterpå. Notater og anstrengelse
          deles aldri i strømmen.
        </Txt>
      </Card>
    </Screen>
  );
}
