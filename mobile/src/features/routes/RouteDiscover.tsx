import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Page, SettingsRow } from "../../components/SettingsUi";
import { IconButton } from "../../components/SocialUi";
import { Button, Chip, Txt, useTheme } from "../../components/ui";
import WorkoutMap from "../../components/WorkoutMap";
import { searchPlaces, type Place } from "../maps/search";
import { useLiveLocation } from "../tracking/useLiveLocation";
import { useLocationStore } from "../../stores/useLocationStore";
import { km } from "../activities/model";
import { searchRoutes } from "./api";
import {
  routeLengths,
  routeMessage,
  routeSports,
  type RouteSport,
  type SuggestedRoute,
} from "./model";

export function RouteDiscover({
  userId,
  initial,
}: {
  userId: string;
  initial?: Place;
}) {
  const c = useTheme();
  const loc = useLiveLocation(true);
  const [place, setPlace] = useState<Place | undefined>(initial);
  const [query, setQuery] = useState(
    initial?.name === "Nær meg" ? "" : (initial?.name ?? ""),
  );
  const [places, setPlaces] = useState<Place[]>([]);
  const [sport, setSport] = useState<RouteSport>("Løping");
  const [length, setLength] = useState(0);
  const [routes, setRoutes] = useState<SuggestedRoute[]>([]);
  const [selected, setSelected] = useState(0);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState<"places" | "routes" | "location" | null>(
    null,
  );
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useFocusEffect(
    useCallback(() => {
      setBusy(null);
      return () => {
        request.current?.abort();
        request.current = null;
      };
    }, []),
  );
  const reset = () => {
    request.current?.abort();
    request.current = null;
    setBusy(null);
    setError("");
    setRoutes([]);
    setSearched(false);
  };
  async function findPlace() {
    if (!query.trim()) return;
    reset();
    const controller = new AbortController();
    request.current = controller;
    setBusy("places");
    setPlaces([]);
    setPlace(undefined);
    try {
      const result = await searchPlaces(query, controller.signal);
      if (!controller.signal.aborted) {
        setPlaces(result);
        if (!result.length)
          setError("Fant ikke stedet. Prøv med sted og kommune.");
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Stedssøket feilet. Prøv igjen.",
        );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(null);
      }
    }
  }
  async function nearby() {
    reset();
    const controller = new AbortController();
    request.current = controller;
    setBusy("location");
    setPlaces([]);
    try {
      if (!(await loc.request()))
        throw new Error(
          "Tillat posisjon for «Nær meg», eller søk etter et sted.",
        );
      if (controller.signal.aborted) return;
      const fresh = () => {
        const p = useLocationStore.getState().position;
        return p &&
          Date.now() - p.timestamp < 30000 &&
          p.accuracy !== null &&
          p.accuracy <= 100
          ? p
          : null;
      };
      const point =
        fresh() ??
        (await new Promise<NonNullable<ReturnType<typeof fresh>>>(
          (resolve, reject) => {
            let unsubscribe = () => {};
            const end = (error?: Error) => {
              clearTimeout(timer);
              unsubscribe();
              controller.signal.removeEventListener("abort", cancel);
              if (error) reject(error);
            };
            const cancel = () => end(new Error("Avbrutt"));
            const timer = setTimeout(
              () =>
                end(
                  new Error(
                    "Fant ikke posisjonen. Søk etter et sted i stedet.",
                  ),
                ),
              12000,
            );
            unsubscribe = useLocationStore.subscribe(() => {
              const p = fresh();
              if (p) {
                end();
                resolve(p);
              }
            });
            controller.signal.addEventListener("abort", cancel, { once: true });
            const latest = fresh();
            if (latest) {
              end();
              resolve(latest);
            }
          },
        ));
      if (!controller.signal.aborted) {
        const next = {
          id: "nearby",
          name: "Nær meg",
          latitude: point.latitude,
          longitude: point.longitude,
        };
        setPlace(next);
        setQuery("");
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Kunne ikke finne posisjonen.",
        );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(null);
      }
    }
  }
  async function findRoutes() {
    if (!place || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy("routes");
    setError("");
    setRoutes([]);
    setSearched(false);
    Keyboard.dismiss();
    try {
      const found = await searchRoutes(
        userId,
        { ...place, sport, length },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setRoutes(found);
        setSelected(0);
        setSearched(true);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(routeMessage(e));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(null);
      }
    }
  }
  const route = routes[selected];
  return (
    <Page
      title="Ruteforslag"
      fallback="/(tabs)/map"
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lagrede løyper"
          onPress={() =>
            router.push({ pathname: "/routes", params: { tab: "saved" } })
          }
          style={{ padding: 12 }}
        >
          <Txt size={14} weight="700">
            Lagret
          </Txt>
        </Pressable>
      }
    >
      <View style={{ padding: 20, gap: 16 }}>
        <Txt size={26} weight="700">
          Finn din neste løype
        </Txt>
        <Txt muted size={14}>
          Løyper delt av folk som har gått eller løpt dem. Finn en løype i ditt
          område, eller bidra med din egen.
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            accessibilityLabel="Søk etter sted"
            value={query}
            placeholder="Søk etter sted"
            placeholderTextColor={c.muted}
            onChangeText={(text) => {
              reset();
              setQuery(text);
              setPlace(undefined);
              setPlaces([]);
            }}
            onSubmitEditing={findPlace}
            returnKeyType="search"
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              padding: 14,
              fontSize: 16,
              backgroundColor: c.surface,
              color: c.text,
            }}
          />
          <IconButton
            name="search"
            label="Søk etter sted"
            onPress={findPlace}
            disabled={busy === "places" || !query.trim()}
          />
        </View>
        <Button
          title={busy === "location" ? "Finner posisjon …" : "Nær meg"}
          icon="locate"
          secondary
          disabled={!!busy}
          onPress={nearby}
        />
        {places.map((p) => (
          <SettingsRow
            key={p.id}
            title={p.name}
            icon="map"
            label={`Velg ${p.name}`}
            onPress={() => {
              reset();
              setPlace(p);
              setQuery(p.name);
              setPlaces([]);
              Keyboard.dismiss();
            }}
          />
        ))}
        {!!place && (
          <Txt muted size={13}>
            Område: {place.name}
          </Txt>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {routeSports.map((value) => (
            <Chip
              key={value}
              title={value}
              selected={value === sport}
              onPress={() => {
                reset();
                setSport(value);
              }}
            />
          ))}
        </View>
        <Txt weight="700">Lengde</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[0, ...routeLengths].map((value) => (
            <Chip
              key={value}
              title={value ? `${value / 1000} km` : "Alle lengder"}
              selected={value === length}
              onPress={() => {
                reset();
                setLength(value);
              }}
            />
          ))}
        </View>
        <Button
          title={busy === "routes" ? "Finner løyper …" : "Finn løyper"}
          disabled={!place || !!busy}
          onPress={findRoutes}
        />
        <Txt muted size={12}>
          Viser inntil 20 delte løyper innen 15 km fra området du velger.
        </Txt>
        <Button
          title="Bidra med en løype"
          secondary
          onPress={() =>
            router.push({ pathname: "/routes", params: { tab: "contribute" } })
          }
        />
        {!!busy && (
          <ActivityIndicator accessibilityLabel="Søker" color={c.accent} />
        )}
        {!!error && <Txt accessibilityRole="alert">{error}</Txt>}
        {searched && !routes.length && (
          <Txt>
            {length
              ? "Ingen delte løyper passer søket her ennå. Prøv «Alle lengder», eller bidra med din egen tur."
              : "Ingen delte løyper i dette området ennå. Bli den første til å dele en tur herfra."}
          </Txt>
        )}
        {!!route && (
          <>
            <Txt size={23} weight="700">
              Løyper ved {place?.name}
            </Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {routes.map((r, i) => (
                <Chip
                  key={r.id}
                  title={r.name}
                  selected={i === selected}
                  onPress={() => setSelected(i)}
                />
              ))}
            </View>
            <WorkoutMap points={route.route} height={240} />
            <Txt size={20} weight="700">
              {km(route.distance_m / 1000)} km
              {route.ascent_m !== null ? ` · ${route.ascent_m} m stigning` : ""}
            </Txt>
            <Txt muted size={14}>
              {route.name} · {route.place}
            </Txt>
            <Button
              title="Se og lagre løypa"
              onPress={() =>
                router.push({
                  pathname: "/routes",
                  params: {
                    id: route.id,
                    name: route.name,
                  },
                })
              }
            />
            <Txt muted size={11}>
              {route.attribution}
            </Txt>
          </>
        )}
      </View>
    </Page>
  );
}
