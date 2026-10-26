import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Switch,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Page, SettingsRow } from "../../components/SettingsUi";
import { Button, Txt, useTheme } from "../../components/ui";
import WorkoutMap from "../../components/WorkoutMap";
import { useAppStore } from "../../stores/useAppStore";
import { duration, km } from "../activities/model";
import { turfPreview } from "./eligibility";
import { loadTurfReceipt, submitTurf, turfError, type TurfResult } from "./api";
import { useTurf } from "./TurfDetail";

export function TurfComposer({
  userId,
  turfId,
  workoutId,
}: {
  userId: string;
  turfId?: string;
  workoutId?: string;
}) {
  const c = useTheme();
  const all = useAppStore((s) => s.workouts);
  const workouts = useMemo(
    () =>
      all
        .filter(
          (w) =>
            w.ownerId === userId && w.source === "gps" && w.sport === "Løping",
        )
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [all, userId],
  );
  const [selected, setSelected] = useState(workoutId ?? "");
  const workout = workouts.find((w) => w.id === selected);
  const { turf, error: loadError, loading, retry } = useTurf(turfId);
  const [name, setName] = useState("");
  const [extend, setExtend] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);
  const [receiptCheck, setReceiptCheck] = useState<{
    workoutId: string;
    result: TurfResult | null;
    error: string;
  } | null>(null);
  const checked = receiptCheck?.workoutId === workout?.id ? receiptCheck : null;
  const receipt = checked?.result;
  const checking = !!workout && !checked;
  const [saved, setSaved] = useState<Awaited<
    ReturnType<typeof submitTurf>
  > | null>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const publishing = useRef<AbortController | null>(null);
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      publishing.current = new AbortController();
      return () => {
        alive.current = false;
        publishing.current?.abort();
      };
    }, []),
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!workout) return;
    void loadTurfReceipt(userId, workout.id, controller.signal)
      .then((result) => {
        if (active)
          setReceiptCheck({ workoutId: workout.id, result, error: "" });
      })
      .catch((e) => {
        if (active)
          setReceiptCheck({
            workoutId: workout.id,
            result: null,
            error: turfError(e),
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [workout, userId]);
  const preview = useMemo(() => {
    if (!workout || (turfId && (!turf || loading || loadError))) return null;
    try {
      return { value: turfPreview(workout, turf, extend).value, error: "" };
    } catch (e) {
      return { value: null, error: turfError(e) };
    }
  }, [workout, turfId, turf, extend, loading, loadError]);
  const openResult = (id: string) =>
    router.replace({ pathname: "/turf", params: { turfId: id } });
  if (saved)
    return (
      <Page
        key="saved"
        title={saved.existing ? "Allerede lagret" : "Bekreftet"}
        fallback="/turf"
        onBack={() => router.replace("/turf")}
      >
        <View style={{ padding: 24, gap: 22 }}>
          <Txt size={30} weight="700">
            {saved.existing
              ? "Vi fant soneresultatet ditt"
              : !turfId
                ? "Sonen er lagt ut!"
                : saved.result.won
                  ? "Sonen er din!"
                  : "Forsøket er lagret"}
          </Txt>
          <Txt>
            {saved.existing
              ? "Denne økten er allerede brukt i et soneforsøk. Åpne sonen for å se dagens eier og løype."
              : saved.result.won
                ? "Andre løpere kan nå se sonen og utfordre tiden. Du finner den under Soner."
                : "Du slo ikke tiden denne gangen. Sonen beholder eieren."}
          </Txt>
          <Txt weight="700">
            {km(saved.result.distance_m / 1000)} km ·{" "}
            {duration(saved.result.seconds)} på ditt forsøk
          </Txt>
          <Button
            title="Se sonen"
            onPress={() => openResult(saved.result.turf_id)}
          />
          <Button
            title="Til sonene"
            secondary
            onPress={() => router.replace("/turf")}
          />
        </View>
      </Page>
    );
  const blockedTarget = !!turfId && (loading || !!loadError || !turf);
  if (!selected)
    return (
      <Page
        key="choose"
        title={turfId ? "Velg soneforsøk" : "Legg ut sone"}
        fallback="/turf"
        scroll={false}
      >
        <FlatList
          data={blockedTarget ? [] : workouts}
          keyExtractor={(w) => w.id}
          contentContainerStyle={{
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
            paddingBottom: 24,
          }}
          ListHeaderComponent={
            <View style={{ padding: 22, gap: 12 }}>
              <Txt size={24} weight="700">
                Velg en løpetur
              </Txt>
              <Txt muted>
                {turf
                  ? `Et forsøk på ${turf.name}.`
                  : "Gjør en lagret tur til en sone andre kan utfordre."}{" "}
                Du ser kartet før du deler.
              </Txt>
              {loading && (
                <ActivityIndicator accessibilityLabel="Henter sonen" />
              )}
              {!!loadError && (
                <>
                  <Txt accessibilityRole="alert">{loadError}</Txt>
                  <Button title="Prøv igjen" secondary onPress={retry} />
                </>
              )}
            </View>
          }
          renderItem={({ item: w }) => (
            <SettingsRow
              title={w.title}
              icon="run"
              description={`${new Date(w.date).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })} · ${km(w.distance)} km · ${duration(w.seconds)}`}
              label={`Velg ${w.title}`}
              onPress={() => {
                setSelected(w.id);
                setName("");
                setError("");
              }}
            />
          )}
          ListEmptyComponent={
            !blockedTarget ? (
              <View style={{ padding: 22, gap: 18 }}>
                <Txt>
                  Du har ingen lagrede GPS-løpeturer på denne kontoen ennå.
                </Txt>
                <Button
                  title="Start en løpetur"
                  onPress={() => router.push("/(tabs)/track")}
                />
              </View>
            ) : undefined
          }
        />
      </Page>
    );
  const message =
    loadError ||
    preview?.error ||
    (!workout
      ? "Denne løpeturen finnes ikke på denne enheten og kontoen. Velg en annen tur."
      : "");
  return (
    <Page
      key="review"
      title={turfId ? "Ditt soneforsøk" : "Se over sonen"}
      fallback="/turf"
      backDisabled={busy}
      onBack={() => {
        if (!lock.current) {
          setSelected("");
          setError("");
          setExtend(false);
        }
      }}
      footer={
        receipt ? (
          <Button
            title="Se sonen fra denne økten"
            onPress={() => openResult(receipt.turf_id)}
          />
        ) : (
          <>
            {!!(error || checked?.error) && (
              <Txt accessibilityRole="alert" size={14}>
                {error || checked?.error}
              </Txt>
            )}
            {!message && (
              <Txt muted size={12}>
                Når du trykker «{turfId ? "Send soneforsøk" : "Legg ut sone"}»,
                deler du løypa og resultatet med alle innloggede løpere.
              </Txt>
            )}
            <Button
              title={
                busy
                  ? "Legger ut …"
                  : checking
                    ? "Sjekker tidligere forsøk …"
                    : turfId
                      ? "Send soneforsøk"
                      : "Legg ut sone"
              }
              disabled={
                busy ||
                checking ||
                blockedTarget ||
                !preview?.value ||
                (!turfId && !name.trim()) ||
                turf?.owner_id === userId
              }
              onPress={async () => {
                if (
                  !workout ||
                  lock.current ||
                  blockedTarget ||
                  !preview?.value
                )
                  return;
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  const result = await submitTurf(
                    workout,
                    userId,
                    turf,
                    extend,
                    name,
                    publishing.current?.signal,
                  );
                  if (alive.current) setSaved(result);
                } catch (e) {
                  if (alive.current)
                    setError(
                      `${turfError(e)} Du kan prøve igjen med samme økt.`,
                    );
                } finally {
                  lock.current = false;
                  if (alive.current) setBusy(false);
                }
              }}
            />
          </>
        )
      }
    >
      <View style={{ padding: 20, gap: 16 }}>
        {loading && <ActivityIndicator accessibilityLabel="Henter sonen" />}
        {receipt ? (
          <>
            <Txt size={24} weight="700">
              Økten er allerede brukt
            </Txt>
            <Txt>
              Vi fant et lagret soneforsøk for denne turen. Åpne sonen under for
              å se den. Samme tur lager ikke flere soner.
            </Txt>
          </>
        ) : (
          <>
            {preview?.value && (
              <WorkoutMap points={preview.value.route} height={220} />
            )}
            {!turfId && (
              <>
                <Txt weight="700">Navn på sonen</Txt>
                <TextInput
                  accessibilityLabel="Navn på sonen"
                  value={name}
                  onChangeText={setName}
                  maxLength={80}
                  editable={!busy}
                  placeholder="For eksempel: Langs elva"
                  placeholderTextColor={c.muted}
                  returnKeyType="done"
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.surface,
                    color: c.text,
                    fontSize: 17,
                  }}
                />
                {!name.trim() && (
                  <Txt muted size={13}>
                    Skriv et navn før du legger ut sonen.
                  </Txt>
                )}
              </>
            )}
            {turf && (
              <Txt size={22} weight="700">
                {turf.name}
              </Txt>
            )}
            {!!workout && (
              <Txt muted size={14}>
                Fra {workout.title}
              </Txt>
            )}
            {preview?.value && (
              <>
                <Txt size={22} weight="700">
                  {km(preview.value.distance / 1000)} km ·{" "}
                  {duration(preview.value.seconds)}
                </Txt>
                <Txt muted size={13}>
                  Synlig løype · totaltid med pauser
                </Txt>
                <Txt muted size={14}>
                  500 meter rundt turens start og slutt er skjermet. Bare
                  kartutsnittet over deles.
                </Txt>
                {turf && (
                  <Txt>
                    {turf.owner_id === userId
                      ? "Du eier allerede denne sonen."
                      : `Din tid på sonen: ${duration(preview.value.originalSeconds)}. Tid å slå: ${duration(turf.seconds)}.`}
                  </Txt>
                )}
              </>
            )}
            {!!message && (
              <View
                style={{
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: c.surface,
                  gap: 8,
                }}
              >
                <Txt weight="700">
                  {loadError
                    ? "Kunne ikke hente sonen"
                    : "Denne turen kan ikke legges ut som sone"}
                </Txt>
                <Txt accessibilityRole="alert" size={14}>
                  {message}
                </Txt>
                {!!loadError && (
                  <Button title="Prøv igjen" secondary onPress={retry} />
                )}
              </View>
            )}
            {turf && turf.owner_id !== userId && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Txt size={14} style={{ flex: 1 }}>
                  Utvid med resten av løpeturen
                </Txt>
                <Switch
                  accessibilityLabel="Utvid sonen"
                  value={extend}
                  disabled={busy}
                  onValueChange={(value) => {
                    setExtend(value);
                    setError("");
                  }}
                />
              </View>
            )}
          </>
        )}
        <Button
          title="Velg en annen løpetur"
          secondary
          disabled={busy}
          onPress={() => {
            setSelected("");
            setError("");
            setExtend(false);
          }}
        />
        {!receipt && (
          <>
            <Button
              title={details ? "Skjul sonekrav" : "Slik fungerer soner"}
              secondary
              onPress={() => setDetails((value) => !value)}
            />
            {details && (
              <Txt muted size={13}>
                Bruk en GPS-løpetur fra de siste 7 dagene. Minst 200 meter
                sammenhengende løype må være igjen utenfor de skjermede
                områdene. Best totaltid vinner. GPS-data kontrolleres ved
                publisering, men dette er ikke en offisiell konkurranse. Bare
                synlige GPS-punkter sendes til kontroll; tidsstemplene lagres
                ikke på serveren.
              </Txt>
            )}
          </>
        )}
      </View>
    </Page>
  );
}
