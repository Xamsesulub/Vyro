import { mapboxToken, hasMapbox } from "./config";
import type { Place } from "./search.types";
export type { Place } from "./search.types";
export async function searchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<Place[]> {
  if (!hasMapbox) throw new Error("Mapbox er ikke aktivert.");
  const params = new URLSearchParams({
    q: query.trim(),
    access_token: mapboxToken,
    autocomplete: "false",
    limit: "5",
    language: "nb",
  });
  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
    { signal },
  );
  if (!res.ok)
    throw new Error(
      res.status === 401 || res.status === 403
        ? "Stedssøk er ikke tilgjengelig med denne karttilgangen."
        : "Kunne ikke søke etter steder. Prøv igjen.",
    );
  const data = await res.json();
  return (data.features ?? []).flatMap(
    (f: {
      id: string;
      properties?: { full_address?: string; name?: string };
      geometry?: { coordinates?: number[] };
    }) => {
      const c = f.geometry?.coordinates;
      if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return [];
      return [
        {
          id: f.id,
          name: f.properties?.full_address ?? f.properties?.name ?? "Sted",
          longitude: c[0],
          latitude: c[1],
        },
      ];
    },
  );
}
