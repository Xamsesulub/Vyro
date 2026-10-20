import { useCallback, useState } from "react";
import { Switch, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { Button, Card, Header, Screen, Txt, useTheme } from "../components/ui";
import WorkoutMap from "../components/WorkoutMap";
import { useAuthStore } from "../stores/useAuthStore";
import { useAppStore } from "../stores/useAppStore";
import { duration, km } from "../features/activities/model";
import { GrowingTurf, previewGrowth } from "../features/turf/growth";
import { competitionTrace } from "../features/turf/trace";
import {
  loadTurfs,
  submitTurf,
  turfError,
  TurfResult,
} from "../features/turf/api";
import { client } from "../features/social/api";

export default function TurfScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return (
    <AccountGate>
      {userId && <Competition key={userId} userId={userId} />}
    </AccountGate>
  );
}
function Competition({ userId }: { userId: string }) {
  const params = useLocalSearchParams<{
    workoutId?: string;
    turfId?: string;
  }>();
  const c = useTheme();
  const all = useAppStore((s) => s.workouts);
  const workouts = all.filter(
    (w) => w.ownerId === userId && w.source === "gps" && w.sport === "Løping",
  );
  const [workoutId, setWorkoutId] = useState(params.workoutId ?? "");
  const workout = workouts.find((w) => w.id === workoutId);
  const [selection, setSelection] = useState(params.turfId ?? "");
  const [turfs, setTurfs] = useState<GrowingTurf[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [onlyFollowing, setOnlyFollowing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extend, setExtend] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("Min løypesone");
  const [result, setResult] = useState<TurfResult | null>(null);
  const [reload, setReload] = useState(0);
  const [withdraw, setWithdraw] = useState(false);
  const turf = turfs.find((t) => t.id === selection) ?? null;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        setError("");
        try {
          const zones = await loadTurfs();
          const f = await client()
            .from("follows")
            .select("following_id")
            .eq("follower_id", userId);
          if (f.error) throw f.error;
          if (active) {
            setTurfs(zones);
            setFollowing(f.data.map((p) => p.following_id));
          }
        } catch (e) {
          if (active) setError(turfError(e));
        } finally {
          if (active) setLoading(false);
        }
      }
      void load();
      return () => {
        active = false;
      };
      // Explicit refresh after a mutation or user retry.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, reload]),
  );
  const preview = (() => {
    if (!workout || (!turf && selection !== "new")) return null;
    try {
      return {
        value: previewGrowth(competitionTrace(workout), turf, extend),
        error: "",
      };
    } catch (e) {
      return { value: null, error: turfError(e) };
    }
  })();
  function choose(id: string) {
    setSelection(id);
    setExtend(false);
    setConsent(false);
    setResult(null);
    setError("");
    setWithdraw(false);
  }
  const filtered = turfs.filter(
    (t) =>
      !onlyFollowing || t.owner_id === userId || following.includes(t.owner_id),
  );
  return (
    <Screen>
      <Button
        title="Til kartet"
        secondary
        onPress={() => router.replace("/(tabs)/map")}
      />
      <Header eyebrow="TURF · LØPING" title="Løp. Overtak. Utvid." />
      <Txt muted>
        Slå tiden på hele løypa. Velg så om resten av turen skal bli del av din
        nye sone. Neste utfordrer må slå hele den nye løypa.
      </Txt>
      <Txt size={12} muted>
        Totaltid med pauser teller. GPS-kontroll er under utprøving; dette er
        ikke en offisiell konkurranse.
      </Txt>
      {!!error && <Txt>{error}</Txt>}
      <Button
        title={loading ? "Henter soner …" : "Oppdater soner"}
        secondary
        disabled={loading || busy}
        onPress={() => setReload((n) => n + 1)}
      />
      {result ? (
        <Card>
          <Txt size={24} weight="700">
            {result.won
              ? result.extended
                ? "Sonen er din — og lengre!"
                : "Sonen er din!"
              : "Sonen beholder eieren"}
          </Txt>
          <Txt>
            {km(result.distance_m / 1000)} km ·{" "}
            {duration(result.target_seconds)} å slå på gjeldende løype.
          </Txt>
          <Txt muted>
            {result.won
              ? "Resultatet er lagret på serveren. Andre kan nå utfordre løypa."
              : "Din tid slo ikke gjeldende rekord. Lik tid gir ikke eierskifte."}
          </Txt>
          <Button
            title="Se sonene"
            onPress={() => {
              choose("");
              setReload((n) => n + 1);
            }}
          />
        </Card>
      ) : (
        <>
          {!selection && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Txt>Mine og de jeg følger</Txt>
                <Switch
                  accessibilityLabel="Bare soner fra løpere jeg følger"
                  value={onlyFollowing}
                  onValueChange={setOnlyFollowing}
                />
              </View>
              {filtered.map((t) => (
                <Card key={t.id}>
                  <Txt size={20} weight="700">
                    {t.name}
                  </Txt>
                  <Txt muted>
                    {t.profiles?.display_name ?? "Løper"} ·{" "}
                    {km(t.distance_m / 1000)} km · {duration(t.seconds)} å slå
                  </Txt>
                  <Button
                    title={`Se ${t.name}`}
                    secondary
                    onPress={() => choose(t.id)}
                  />
                </Card>
              ))}
              {!loading && !error && !filtered.length && (
                <Txt muted>
                  Ingen soner her ennå. Du kan vise alle soner eller opprette en
                  fra din egen løpetur.
                </Txt>
              )}
              <Button
                title="Opprett sone fra en løpetur"
                disabled={loading || !!error}
                onPress={() => choose("new")}
              />
              {turfs.length === 100 && (
                <Txt muted size={12}>
                  Viser de 100 sist oppdaterte sonene.
                </Txt>
              )}
            </>
          )}
          {!!selection && (
            <>
              <Button
                title="Velg en annen sone"
                secondary
                disabled={busy}
                onPress={() => choose("")}
              />
              {turf && (
                <>
                  <Txt size={24} weight="700">
                    {turf.name}
                  </Txt>
                  <WorkoutMap points={turf.route} height={230} />
                  <Txt>
                    {turf.profiles?.display_name ?? "Løper"} eier{" "}
                    {km(turf.distance_m / 1000)} km · {duration(turf.seconds)} å
                    slå.
                  </Txt>
                  <Button
                    title="Løp denne løypa"
                    secondary
                    onPress={() => {
                      if (
                        !useAppStore
                          .getState()
                          .selectTurf({
                            id: turf.id,
                            name: turf.name,
                            route: turf.route,
                          })
                      ) {
                        setError(
                          "Avslutt økten som pågår før du velger en ny sone.",
                        );
                        return;
                      }
                      router.push("/(tabs)/track");
                    }}
                  />
                  <Txt muted size={12}>
                    Start et GPS-opptak. Etter lagring velger du «Bruk økten i
                    en sone» og denne løypa. Ingen automatisk publisering.
                  </Txt>
                  {turf.owner_id === userId && (
                    <>
                      <Txt muted>
                        Du eier sonen. Andre kan utfordre deg. Du kan trekke
                        tilbake sonen og sonehistorikken din her.
                      </Txt>
                      <Button
                        title={
                          withdraw
                            ? "Bekreft: fjern sonen og historikken"
                            : "Trekk tilbake sonen"
                        }
                        secondary={!withdraw}
                        danger={withdraw}
                        disabled={busy}
                        onPress={async () => {
                          if (!withdraw) {
                            setWithdraw(true);
                            return;
                          }
                          setBusy(true);
                          try {
                            const r = await client()
                              .from("turfs")
                              .delete()
                              .eq("id", turf.id)
                              .eq("owner_id", userId)
                              .select("id");
                            if (r.error) throw r.error;
                            if (!r.data.length)
                              throw new Error(
                                "Sonen har endret eier. Oppdater for å se gjeldende sone.",
                              );
                            choose("");
                            setReload((n) => n + 1);
                          } catch (e) {
                            setError(turfError(e));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                      {withdraw && (
                        <Button
                          title="Behold sonen"
                          secondary
                          onPress={() => setWithdraw(false)}
                        />
                      )}
                    </>
                  )}
                </>
              )}
              {selection === "new" && (
                <TextInput
                  accessibilityLabel="Navn på sonen"
                  value={name}
                  onChangeText={setName}
                  maxLength={80}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: c.raised,
                    color: c.text,
                    fontSize: 16,
                  }}
                />
              )}
              <Txt weight="700">Velg din lagrede GPS-løpetur</Txt>
              {workouts.map((w) => (
                <Button
                  key={w.id}
                  secondary={w.id !== workoutId}
                  title={w.title}
                  disabled={busy}
                  onPress={() => {
                    setWorkoutId(w.id);
                    setConsent(false);
                    setResult(null);
                  }}
                />
              ))}
              {!workouts.length && (
                <Txt muted>
                  Du trenger en ekte GPS-løpetur. Simuleringer kan ikke vinne
                  soner.
                </Txt>
              )}
              {!!workout && !workout.turfTrace?.length && (
                <Txt>
                  Dette eldre opptaket mangler GPS-tidsstempler. Ta opp en ny
                  løpetur for å konkurrere.
                </Txt>
              )}
              {!!turf && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Txt style={{ flex: 1 }}>
                    Utvid sonen med resten av den synlige turen
                  </Txt>
                  <Switch
                    accessibilityLabel="Utvid sonen"
                    disabled={busy || turf.owner_id === userId}
                    value={extend}
                    onValueChange={(value) => {
                      setExtend(value);
                      setConsent(false);
                    }}
                  />
                </View>
              )}
              {!!preview?.error && <Txt>{preview.error}</Txt>}
              {preview?.value && (
                <Card>
                  <Txt weight="700">
                    {extend
                      ? "Din nye, lengre sone"
                      : "Løypa du konkurrerer om"}
                  </Txt>
                  <WorkoutMap points={preview.value.route} height={240} />
                  <Txt>
                    {km(preview.value.distance / 1000)} km ·{" "}
                    {duration(preview.value.seconds)} totalt
                  </Txt>
                  {!!turf && (
                    <Txt muted>
                      Din tid på den opprinnelige sonen:{" "}
                      {duration(preview.value.originalSeconds)}.{" "}
                      {preview.value.wins
                        ? "Raskere enn gjeldende tid — venter på serverkontroll."
                        : "Ikke raskere enn gjeldende tid."}
                    </Txt>
                  )}
                  <Txt muted size={12}>
                    500 meter rundt øktens start og slutt er skjermet. Bare
                    denne synlige løypa med tidsstempler sendes for kontroll.
                    GPS-tidsstemplene lagres ikke på serveren.
                  </Txt>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Txt style={{ flex: 1 }}>
                      Jeg vil dele denne konkurranseløypa og resultatet med
                      innloggede løpere.
                    </Txt>
                    <Switch
                      accessibilityLabel="Godkjenn deling av sonen"
                      value={consent}
                      disabled={busy}
                      onValueChange={setConsent}
                    />
                  </View>
                  <Button
                    title={
                      busy
                        ? "Kontrollerer løpeturen …"
                        : selection === "new"
                          ? "Opprett min sone"
                          : extend
                            ? "Overta og utvid sonen"
                            : "Send forsøk"
                    }
                    disabled={
                      busy ||
                      loading ||
                      !consent ||
                      !name.trim() ||
                      turf?.owner_id === userId
                    }
                    onPress={async () => {
                      if (!workout) return;
                      setBusy(true);
                      setError("");
                      try {
                        setResult(
                          await submitTurf(workout, userId, turf, extend, name),
                        );
                      } catch (e) {
                        setError(turfError(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </Card>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
