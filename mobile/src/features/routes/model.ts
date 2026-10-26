import type { RoutePoint } from "../tracking/gps";
export const routeSports = ["Løping", "Gange", "Fottur"] as const;
export type RouteSport = (typeof routeSports)[number];
export const routeLengths = [3000, 5000, 10000, 15000] as const;
export type RouteSummary = {
  id: string;
  name: string;
  sport: RouteSport;
  distance_m: number;
  ascent_m: number | null;
  source: "community" | "openrouteservice";
  place?: string | null;
  contributor_id?: string | null;
  attribution: string;
  created_at: string;
};
export type SuggestedRoute = RouteSummary & { route: RoutePoint[] };
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
    ["community", "openrouteservice"].includes(r.source) &&
    typeof r.attribution === "string" &&
    Number.isFinite(r.distance_m) &&
    r.distance_m >= 500 &&
    r.distance_m <= 50000 &&
    (r.ascent_m === null ||
      (Number.isFinite(r.ascent_m) && r.ascent_m >= 0 && r.ascent_m <= 20000))
  );
}
export function isSuggestedRoute(value: unknown): value is SuggestedRoute {
  const r = value as SuggestedRoute;
  return (
    isRouteSummary(r) &&
    Array.isArray(r.route) &&
    r.route.length >= 2 &&
    r.route.length <= 20000 &&
    r.route.every(
      (p) =>
        !!p &&
        Number.isFinite(p.latitude) &&
        Math.abs(p.latitude) <= 90 &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.longitude) <= 180 &&
        (p.breakBefore === undefined || typeof p.breakBefore === "boolean"),
    )
  );
}
export function routeMessage(error: unknown) {
  const e = error as { code?: string; message?: string };
  const code = e?.code ?? e?.message ?? "";
  const messages: Record<string, string> = {
    ROUTES_UPDATED: "Oppdater VYRO for løyper delt av brukerne.",
    ROUTES_NOT_CONFIGURED:
      "Ruteforslag er ikke aktivert ennå. Du kan fortsatt bruke kartet, egne turer og soner.",
    SERVICE_UNAVAILABLE:
      "Ruteforslag er midlertidig utilgjengelige. Prøv igjen senere.",
    AUTH_REQUIRED: "Logg inn igjen for å finne og lagre løyper.",
    PGRST116: "Denne løypa finnes ikke lenger. Søk etter nye ruteforslag.",
    INVALID_QUERY: "Velg et sted og en av lengdene under.",
    ROUTE_DUPLICATE:
      "Denne løypa, eller en svært lik løype, er allerede delt. Finn den i Ruteforslag i stedet.",
    ROUTE_INVALID:
      "Velg en gjennomført GPS-tur med minst 500 meter synlig løype og høyst 50 km.",
    ROUTE_CONSENT_REQUIRED:
      "Du må velge å dele løypa før den kan vises til andre.",
    ROUTE_SHARE_LIMIT:
      "Du har delt mange løyper. Vent litt før du deler flere.",
    ROUTE_NOT_FOUND: "Denne løypa er trukket tilbake eller finnes ikke lenger.",
    RATE_LIMIT: "Du har gjort mange søk. Vent litt før du søker igjen.",
    ROUTE_LIBRARY_FULL:
      "Du har nådd grensen på 500 lagrede løyper. Fjern en løype før du lagrer en ny.",
  };
  if (messages[code]) return messages[code];
  for (const [key, text] of Object.entries(messages))
    if (e?.message?.includes(key)) return text;
  if (["42P01", "42883", "PGRST202", "PGRST205"].includes(code))
    return messages.ROUTES_NOT_CONFIGURED;
  if (e?.message?.includes("ROUTE_LIBRARY_FULL"))
    return messages.ROUTE_LIBRARY_FULL;
  return "Kunne ikke hente eller lagre løypa. Kontroller forbindelsen og prøv igjen.";
}
