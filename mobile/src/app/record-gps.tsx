import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { Button, Metric, Screen, Txt, styles } from "../components/ui";
import { useAuthStore } from "../stores/useAuthStore";
import { useGpsStore } from "../stores/useGpsStore";
import { useAppStore } from "../stores/useAppStore";
import {
  distanceMeters,
  Fix,
  segmentDistance,
  validFix,
} from "../features/tracking/gps";
import { duration, km, pace } from "../features/activities/model";

export default function RecordGps() {
  const id = useAuthStore((s) => s.session?.user.id);
  return <AccountGate>{id && <Recorder key={id} userId={id} />}</AccountGate>;
}
function Recorder({ userId }: { userId: string }) {
  const { draft, ready, error } = useGpsStore();
  const own = draft?.ownerId === userId ? draft : null;
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [discard, setDiscard] = useState(false);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const live = useRef(true);
  const generation = useRef(0);
  const running = useRef(false);
  const lastTick = useRef(0);
  const previous = useRef<Fix | null>(null);
  const pause = useCallback(() => {
    generation.current++;
    running.current = false;
    watcher.current?.remove();
    watcher.current = null;
    if (live.current) {
      setActive(false);
      setBusy(false);
    }
  }, []);
  useFocusEffect(useCallback(() => () => pause(), [pause]));
  useEffect(() => {
    live.current = true;
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") pause();
    });
    const timer = setInterval(() => {
      const d = useGpsStore.getState().draft;
      if (!running.current || !d || d.ownerId !== userId) return;
      const now = Date.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      if (dt > 5) {
        pause();
        setMessage("Opptaket ble pauset da appen var inaktiv.");
        return;
      }
      if (previous.current && now - previous.current.timestamp > 30000) {
        pause();
        setMessage("GPS-signalet ble borte. Økten er pauset.");
        return;
      }
      useGpsStore.setState({
        draft: { ...d, seconds: d.seconds + Math.max(0, dt) },
      });
    }, 1000);
    return () => {
      live.current = false;
      pause();
      sub.remove();
      clearInterval(timer);
    };
  }, [userId, pause]);
  async function start() {
    if (busy || active || !ready) return;
    if (draft && draft.ownerId !== userId) {
      setMessage(
        "Et annet konto-opptak ligger på enheten. Logg inn på den kontoen for å avslutte det.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    const attempt = ++generation.current;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!live.current || generation.current !== attempt) return;
      if (!permission.granted)
        throw new Error("Gi VYRO tilgang til posisjon for å registrere økten.");
      const first = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!live.current || generation.current !== attempt) return;
      const fix: Fix = {
        latitude: first.coords.latitude,
        longitude: first.coords.longitude,
        timestamp: first.timestamp,
        accuracy: first.coords.accuracy ?? Infinity,
      };
      if (!validFix(fix))
        throw new Error("GPS-signalet er for svakt. Gå ut og prøv igjen.");
      const current = useGpsStore.getState().draft;
      if (
        current?.points.length &&
        distanceMeters(current.points[current.points.length - 1], fix) > 25
      )
        throw new Error(
          "Fortsett nær stedet du pauset (innen 25 meter), eller lagre økten.",
        );
      if (!current)
        useGpsStore.setState({
          draft: {
            id: `gps-${Date.now()}`,
            ownerId: userId,
            date: new Date().toISOString(),
            points: [fix],
            distance: 0,
            seconds: 0,
          },
        });
      previous.current = fix;
      lastTick.current = Date.now();
      running.current = true;
      setActive(true);
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 3,
          timeInterval: 2000,
        },
        (location) => {
          if (!running.current || generation.current !== attempt) return;
          const p: Fix = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy ?? Infinity,
          };
          if (!validFix(p)) return;
          const d = useGpsStore.getState().draft;
          if (!d || d.ownerId !== userId) return;
          if (d.points.length >= 20000) {
            pause();
            setMessage("Maksimal opptakslengde nådd. Lagre økten.");
            return;
          }
          const meters = previous.current
            ? segmentDistance(previous.current, p)
            : 0;
          if (meters === null) return;
          if (meters > 0) {
            previous.current = p;
            useGpsStore.setState({
              draft: {
                ...d,
                points: [...d.points, p],
                distance: d.distance + meters / 1000,
              },
            });
          } else if (
            previous.current &&
            p.timestamp - previous.current.timestamp > 20000
          )
            previous.current = { ...previous.current, timestamp: p.timestamp };
        },
        () => {
          pause();
          if (live.current)
            setMessage(
              "GPS-opptaket stoppet. Kontroller posisjonstillatelsen.",
            );
        },
      );
      if (!live.current || generation.current !== attempt)
        subscription.remove();
      else watcher.current = subscription;
    } catch (e) {
      pause();
      if (live.current)
        setMessage(e instanceof Error ? e.message : "Kunne ikke starte GPS.");
    } finally {
      if (live.current) setBusy(false);
    }
  }
  function save() {
    pause();
    const d = useGpsStore.getState().draft;
    if (
      !d ||
      d.ownerId !== userId ||
      d.points.length < 2 ||
      d.distance <= 0 ||
      d.seconds < 1
    )
      return;
    const s = useAppStore.getState();
    if (!s.workouts.some((w) => w.id === d.id))
      useAppStore.setState({
        workouts: [
          {
            id: d.id,
            ownerId: userId,
            title: "Min løpetur",
            sport: "Løping",
            date: d.date,
            notes: "",
            source: "gps",
            visibility: "private",
            distance: d.distance,
            seconds: Math.floor(d.seconds),
            route: d.points.map(({ latitude, longitude }) => ({
              latitude,
              longitude,
            })),
          },
          ...s.workouts,
        ],
      });
    // Keep the recoverable draft until the user explicitly discards or starts a new session.
    setMessage("Økten er lagret privat. Du kan nå dele den fra Hjem.");
  }
  const saved = useAppStore((s) => s.workouts.some((w) => w.id === own?.id));
  return (
    <Screen
      footer={
        <>
          {!saved && (
            <Button
              title={
                active
                  ? "Pause"
                  : busy
                    ? "Henter GPS …"
                    : own
                      ? "Fortsett GPS-økt"
                      : "Start GPS-økt"
              }
              large
              disabled={busy || !ready}
              onPress={active ? pause : start}
            />
          )}
          {!active && own && !saved && (
            <Button
              title="Lagre økten privat"
              secondary
              disabled={
                own.points.length < 2 || own.distance <= 0 || own.seconds < 1
              }
              onPress={save}
            />
          )}
          {saved && (
            <Button
              title="Del økten"
              onPress={() => router.push("/share-workout")}
            />
          )}
        </>
      }
    >
      <Button
        title="Tilbake"
        secondary
        onPress={() => {
          pause();
          router.back();
        }}
      />
      <Txt size={28} weight="700">
        GPS-løping
      </Txt>
      <Txt muted size={13}>
        Hold appen åpen og skjermen på. Denne første versjonen pauser når appen
        går i bakgrunnen. Utkastet lagres på enheten.
      </Txt>
      <Txt weight="700">
        {active ? "Opptak pågår" : saved ? "Lagret" : own ? "Pauset" : "Klar"}
      </Txt>
      <View style={styles.row}>
        <Metric value={km(own?.distance ?? 0)} label="kilometer" />
        <Metric value={duration(own?.seconds ?? 0)} label="tid" />
      </View>
      <Metric
        value={pace(own?.distance ?? 0, own?.seconds ?? 0)}
        label="min/km"
      />
      {!!message && <Txt>{message}</Txt>}
      {!!error && <Txt>{error}</Txt>}
      {!active && own && (
        <Button
          title={
            saved
              ? "Klar for ny økt"
              : discard
                ? "Bekreft: forkast utkast"
                : "Forkast utkast"
          }
          secondary
          onPress={() => {
            if (!saved && !discard) {
              setDiscard(true);
              return;
            }
            useGpsStore.setState({ draft: null });
            setDiscard(false);
            setMessage("");
          }}
        />
      )}
    </Screen>
  );
}
