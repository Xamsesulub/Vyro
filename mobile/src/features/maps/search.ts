import { Platform } from "react-native";
import { geocodeAsync } from "expo-location";
import type { Place } from "./search.types";
export type { Place } from "./search.types";

export function searchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<Place[]> {
  const address = query.trim();
  if (signal.aborted) return Promise.reject(new Error("Søket ble avbrutt."));
  if (!address) return Promise.resolve([]);
  if (Platform.OS !== "ios")
    return Promise.reject(new Error("Stedssøk er tilgjengelig på iPhone."));
  // Explicit address lookup through iOS's geocoder. No GPS permission,
  // current-position upload, Mapbox token or extra native module is needed.
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, places: Place[] = []) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(places);
    };
    const abort = () => finish(new Error("Søket ble avbrutt."));
    const timer = setTimeout(
      () => finish(new Error("Stedssøket tok for lang tid. Prøv igjen.")),
      12_000,
    );
    signal.addEventListener("abort", abort, { once: true });
    geocodeAsync(address).then(
      (results) =>
        finish(
          undefined,
          results
            .filter(
              (result) =>
                Number.isFinite(result.latitude) &&
                Number.isFinite(result.longitude),
            )
            .slice(0, 5)
            .map((result, index) => ({
              id: `apple-${result.latitude}-${result.longitude}-${index}`,
              name: address,
              latitude: result.latitude,
              longitude: result.longitude,
            })),
        ),
      () => finish(new Error("Fant ikke adressen. Prøv med gatenavn og sted.")),
    );
  });
}
