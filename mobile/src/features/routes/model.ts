import type { MapPoint } from "../maps/config";
export const routeSports = ["Løping", "Gange", "Fottur"] as const;
export type RouteSport = (typeof routeSports)[number];
export const routeLengths = [3000, 5000, 10000, 15000] as const;
export type RouteSummary = {
  id: string;
  name: string;
  sport: RouteSport;
  distance_m: number;
  ascent_m: number | null;
  source: "openrouteservice";
  attribution: string;
  created_at: string;
};
export type SuggestedRoute = RouteSummary & { route: MapPoint[] };
export type RouteSearch = {
  latitude: number;
  longitude: number;
  sport: RouteSport;
  length: number;
};
export function isRouteSummary(value: unknown): value is RouteSummary {
  const r = value as RouteSummary;
  return (
    !!r &&
    /^[a-f0-9]{64}$/.test(r.id) &&
    typeof r.name === "string" &&
    r.name.length > 0 &&
    r.name.length <= 120 &&
    routeSports.includes(r.sport) &&
    r.source === "openrouteservice" &&
    typeof r.attribution === "string" &&
    Number.isFinite(r.distance_m) &&
    r.distance_m >= 1800 &&
    r.distance_m <= 22500 &&
    (r.ascent_m === null ||
      (Number.isFinite(r.ascent_m) && r.ascent_m >= 0 && r.ascent_m <= 20000))
  );
}
export function isSuggestedRoute(value: unknown): value is SuggestedRoute {
  const r = value as SuggestedRoute;
  return (
    isRouteSummary(r) &&
    Array.isArray(r.route) &&
    r.route.length >= 3 &&
    r.route.length <= 12000 &&
    r.route.every(
      (p) =>
        !!p &&
        Number.isFinite(p.latitude) &&
        Math.abs(p.latitude) <= 90 &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.longitude) <= 180,
    )
  );
}
export function routeMessage(error: unknown) {
  const e = error as { code?: string; message?: string };
  const code = e?.code ?? e?.message ?? "";
  const messages: Record<string, string> = {
    ROUTES_NOT_CONFIGURED:
      "Ruteforslag er ikke aktivert ennå. Du kan fortsatt bruke kartet, egne turer og soner.",
    SERVICE_UNAVAILABLE:
      "Ruteforslag er midlertidig utilgjengelige. Prøv igjen senere.",
    AUTH_REQUIRED: "Logg inn igjen for å finne og lagre løyper.",
    PGRST116: "Denne løypa finnes ikke lenger. Søk etter nye ruteforslag.",
    INVALID_QUERY: "Velg et sted i Norge og en av lengdene under.",
    SEARCH_PENDING:
      "Vi beregner allerede løyper i dette området. Vent litt og prøv igjen.",
    RATE_LIMIT: "Du har gjort mange søk. Vent litt før du søker igjen.",
    PROVIDER_BUSY: "Rutetjenesten er opptatt. Prøv igjen senere.",
    PROVIDER_UNAVAILABLE:
      "Kunne ikke beregne løyper nå. Prøv igjen eller velg et annet startsted.",
    ROUTE_LIBRARY_FULL:
      "Du har nådd grensen på 500 lagrede løyper. Fjern en løype før du lagrer en ny.",
  };
  if (messages[code]) return messages[code];
  if (["42P01", "42883", "PGRST202", "PGRST205"].includes(code))
    return messages.ROUTES_NOT_CONFIGURED;
  if (e?.message?.includes("ROUTE_LIBRARY_FULL"))
    return messages.ROUTE_LIBRARY_FULL;
  return "Kunne ikke hente eller lagre løypa. Kontroller forbindelsen og prøv igjen.";
}
