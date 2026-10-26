import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Linking, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Page } from "../../components/SettingsUi";
import { Button, Txt, useTheme } from "../../components/ui";
import WorkoutMap from "../../components/WorkoutMap";
import { useRouteLibrary } from "../../stores/useRouteLibrary";
import { useAppStore } from "../../stores/useAppStore";
import { km } from "../activities/model";
import {
  getRoute,
  routeIsSaved,
  saveRoute,
  unsaveRoute,
  withdrawRoute,
} from "./api";
import { routeMessage, type SuggestedRoute } from "./model";
export function RouteDetail({
  userId,
  id,
  initialName,
}: {
  userId: string;
  id: string;
  initialName?: string;
}) {
  const cached = useRouteLibrary(
    (s) =>
      s.entries.find((e) => e.ownerId === userId && e.route.id === id)?.route,
  );
  const [loaded, setRoute] = useState<SuggestedRoute | undefined>(cached);
  const c = useTheme();
  const [title, setTitle] = useState(initialName ?? cached?.name ?? "");
  const route = loaded ?? cached;
  const [remoteSaved, setSaved] = useState<boolean | undefined>(undefined);
  const saved = remoteSaved ?? !!cached;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [reload, setReload] = useState(0);
  const request = useRef<AbortController | null>(null),
    lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      request.current = controller;
      lock.current = false;
      setBusy(false);
      setLoading(true);
      setError("");
      void Promise.all([
        getRoute(id, controller.signal),
        routeIsSaved(userId, id, controller.signal),
      ])
        .then(([r, isSaved]) => {
          if (controller.signal.aborted) return;
          setRoute(r);
          setSaved(!!isSaved);
          setTitle(isSaved?.name ?? initialName ?? r.name);
          if (isSaved)
            useRouteLibrary
              .getState()
              .remember(userId, { ...r, name: isSaved.name });
          else useRouteLibrary.getState().forget(userId, id);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            if ((e as { code?: string }).code === "PGRST116") {
              useRouteLibrary.getState().forget(userId, id);
              setRoute(undefined);
            }
            setError(routeMessage(e));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
      // Explicit retry starts a fresh focused request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, id, reload]),
  );
  async function toggle() {
    const controller = request.current;
    if (!route || lock.current || !controller || controller.signal.aborted)
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (saved) await unsaveRoute(userId, id, controller.signal);
      else await saveRoute(userId, id, controller.signal, title);
      if (!controller.signal.aborted) {
        if (saved) useRouteLibrary.getState().forget(userId, id);
        else
          useRouteLibrary
            .getState()
            .remember(userId, { ...route, name: title.trim() || route.name });
        setSaved(!saved);
        setNotice(
          saved
            ? "Løypa er fjernet fra Lagret."
            : "Løypa er lagret på kontoen din.",
        );
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(routeMessage(e));
    } finally {
      if (request.current === controller) {
        lock.current = false;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }
  async function withdraw() {
    const controller = request.current;
    if (
      lock.current ||
      !controller ||
      controller.signal.aborted ||
      route?.contributor_id !== userId
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await withdrawRoute(userId, id, controller.signal);
      if (!controller.signal.aborted) {
        useRouteLibrary.getState().forget(userId, id);
        router.replace({ pathname: "/routes", params: { tab: "contribute" } });
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(routeMessage(e));
    } finally {
      if (!controller.signal.aborted) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <Page
      title="Løype"
      fallback="/routes"
      backDisabled={busy}
      footer={
        route && (
          <>
            {!!error && (
              <Txt accessibilityRole="alert" size={14}>
                {error}
                {cached ? " Viser kopien fra denne enheten." : ""}
              </Txt>
            )}
            {!!notice && <Txt size={14}>{notice}</Txt>}
            <Button
              title={
                busy ? "Lagrer …" : saved ? "Fjern fra Lagret" : "Lagre løypa"
              }
              secondary
              disabled={busy || loading || (!saved && !title.trim())}
              onPress={toggle}
            />
            <Button
              title="Bruk løypa"
              disabled={busy}
              onPress={() => {
                if (
                  !useAppStore
                    .getState()
                    .planRoute(
                      { ...route, name: title.trim() || route.name },
                      userId,
                    )
                ) {
                  setError(
                    "Avslutt økten som pågår før du velger en ny løype.",
                  );
                  return;
                }
                router.push("/(tabs)/track");
              }}
            />
          </>
        )
      }
    >
      <View style={{ padding: 20, gap: 16 }}>
        {loading && <ActivityIndicator accessibilityLabel="Henter løypa" />}
        {!route && !!error && (
          <>
            <Txt accessibilityRole="alert">{error}</Txt>
            <Button
              title="Prøv igjen"
              secondary
              onPress={() => setReload((n) => n + 1)}
            />
          </>
        )}
        {route && (
          <>
            <Txt size={26} weight="700">
              {saved ? title || route.name : route.name}
            </Txt>
            <Txt muted size={14}>
              {route.sport} ·{" "}
              {route.source === "community"
                ? route.place
                : "Tidligere lagret løype"}
            </Txt>
            <WorkoutMap points={route.route} height={270} />
            <Txt size={23} weight="700">
              {km(route.distance_m / 1000)} km
            </Txt>
            <Txt muted>
              {route.ascent_m === null
                ? "Stigning er ikke tilgjengelig"
                : `${route.ascent_m} meter stigning`}
            </Txt>
            <Txt>
              {route.source === "community"
                ? "Delt fra en gjennomført tur. Start og slutt er skjermet. Kontroller adkomst og forhold før du følger løypa."
                : "Denne løypa ble lagret før ruteforslag gikk over til bidrag fra brukerne. Den vises bare i ditt bibliotek."}
            </Txt>
            <Txt muted size={14}>
              «Bruk løypa» åpner GPS-opptaket med løypa på kartet. Du starter
              opptaket selv. Ingen svingvarsler.
            </Txt>
            {!saved && (
              <>
                <Txt weight="700">Navn i Lagret</Txt>
                <TextInput
                  accessibilityLabel="Navn på lagret løype"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={120}
                  editable={!busy}
                  returnKeyType="done"
                  style={{
                    padding: 14,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 12,
                    color: c.text,
                    backgroundColor: c.surface,
                    fontSize: 16,
                  }}
                />
              </>
            )}
            <Txt muted size={14}>
              Lagrede løyper er private på kontoen din. Sist åpnede, lagrede
              løyper kan vises uten nett; selve bakgrunnskartet kan kreve
              forbindelse.
            </Txt>
            <Txt muted size={11}>
              {route.attribution}
            </Txt>
            {route.source === "openrouteservice" && (
              <Button
                title="Kartdata: OpenStreetMap"
                secondary
                onPress={() => {
                  void Linking.openURL(
                    "https://www.openstreetmap.org/copyright",
                  ).catch(() => setError("Kunne ikke åpne lenken."));
                }}
              />
            )}
            {route.contributor_id === userId &&
              route.source === "community" && (
                <>
                  <Button
                    title="Trekk tilbake deling"
                    secondary
                    disabled={busy || loading}
                    onPress={() => setConfirmWithdraw(true)}
                  />
                  {confirmWithdraw && (
                    <>
                      <Txt>
                        Løypa fjernes fra søk og lagrede nettlister. Din private
                        GPS-tur beholdes. Nedlastede kopier hos andre kan ikke
                        hentes tilbake.
                      </Txt>
                      <Button
                        title="Ja, trekk tilbake løypa"
                        disabled={busy}
                        onPress={withdraw}
                      />
                      <Button
                        title="Behold delingen"
                        secondary
                        disabled={busy}
                        onPress={() => setConfirmWithdraw(false)}
                      />
                    </>
                  )}
                </>
              )}
          </>
        )}
      </View>
    </Page>
  );
}
