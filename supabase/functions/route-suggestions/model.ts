export type Point = { latitude: number; longitude: number };
export type RouteQuery = Point & {
  sport: "Løping" | "Gange" | "Fottur";
  length: number;
};
export type SuggestedRoute = {
  id: string;
  name: string;
  sport: RouteQuery["sport"];
  route: Point[];
  distance_m: number;
  ascent_m: number | null;
  source: "openrouteservice";
  attribution: string;
  created_at: string;
};
export class RouteError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function inNorwayRegion(p: Point) {
  // Service envelope, not a claim about exact national borders. Includes the
  // mainland, Svalbard and Jan Mayen; actual availability follows OSM coverage.
  return (
    (p.latitude >= 57.8 &&
      p.latitude <= 71.5 &&
      p.longitude >= 4 &&
      p.longitude <= 32) ||
    (p.latitude >= 74 &&
      p.latitude <= 81.5 &&
      p.longitude >= 9 &&
      p.longitude <= 36) ||
    (p.latitude >= 70 &&
      p.latitude <= 72 &&
      p.longitude >= -10 &&
      p.longitude <= -6)
  );
}
export function parseQuery(value: unknown): RouteQuery {
  const q = value as RouteQuery;
  if (
    !q ||
    typeof q.latitude !== "number" ||
    typeof q.longitude !== "number" ||
    !Number.isFinite(q.latitude) ||
    !Number.isFinite(q.longitude) ||
    !inNorwayRegion(q) ||
    !["Løping", "Gange", "Fottur"].includes(q.sport) ||
    ![3000, 5000, 10000, 15000].includes(q.length)
  )
    throw new RouteError("INVALID_QUERY");
  // Do not retain or forward the precise GPS fix. Searches share ~200 m cells.
  return {
    latitude: Math.round(q.latitude * 500) / 500,
    longitude: Math.round(q.longitude * 500) / 500,
    sport: q.sport,
    length: q.length,
  };
}
export const queryKey = (q: RouteQuery) =>
  `v1:${q.latitude.toFixed(3)}:${q.longitude.toFixed(3)}:${q.sport}:${q.length}`;
export function meters(a: Point, b: Point) {
  const r = Math.PI / 180,
    dLat = (b.latitude - a.latitude) * r,
    dLon = (b.longitude - a.longitude) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function providerRequest(q: RouteQuery, seed: number) {
  return {
    coordinates: [[q.longitude, q.latitude]],
    radiuses: [500],
    elevation: true,
    instructions: false,
    options: {
      avoid_features: ["ferries", "fords"],
      round_trip: { length: q.length, points: 3, seed },
    },
  };
}
export async function parseProvider(
  value: unknown,
  q: RouteQuery,
  now = new Date(),
): Promise<SuggestedRoute | null> {
  const feature = (value as { features?: unknown[] })?.features?.[0] as
    | {
        geometry?: { type?: string; coordinates?: number[][] };
        properties?: {
          summary?: { distance?: number };
          ascent?: number;
          warnings?: { code: number }[];
        };
      }
    | undefined;
  const coords = feature?.geometry?.coordinates;
  const distance = feature?.properties?.summary?.distance;
  if (
    feature?.geometry?.type !== "LineString" ||
    !Array.isArray(coords) ||
    coords.length < 3 ||
    coords.length > 12000 ||
    typeof distance !== "number" ||
    !Number.isFinite(distance) ||
    distance < q.length * 0.6 ||
    distance > q.length * 1.5 ||
    // Never show a route with skipped/unroutable segments as a complete loop.
    feature.properties?.warnings?.some((w) => w.code === 3)
  )
    return null;
  const route: Point[] = [];
  for (const p of coords) {
    if (
      !Array.isArray(p) ||
      p.length < 2 ||
      !Number.isFinite(p[0]) ||
      !Number.isFinite(p[1]) ||
      Math.abs(p[0]) > 180 ||
      Math.abs(p[1]) > 90
    )
      return null;
    const next = {
      latitude: Math.round(p[1] * 1e6) / 1e6,
      longitude: Math.round(p[0] * 1e6) / 1e6,
    };
    if (!route.length || meters(route[route.length - 1], next) > 0.1)
      route.push(next);
  }
  if (
    route.length < 3 ||
    meters(route[0], q) > 1000 ||
    meters(route[0], route[route.length - 1]) > 100
  )
    return null;
  const measured = route
    .slice(1)
    .reduce((sum, p, i) => sum + meters(route[i], p), 0);
  if (measured < distance * 0.7 || measured > distance * 1.3) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify({ sport: q.sport, route })),
  );
  const id = Array.from(new Uint8Array(digest), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
  const ascent = feature.properties?.ascent;
  return {
    id,
    name: `Rundtur · ${(distance / 1000).toFixed(1).replace(".", ",")} km`,
    sport: q.sport,
    route,
    distance_m: Math.round(distance),
    ascent_m:
      typeof ascent === "number" && Number.isFinite(ascent) && ascent >= 0
        ? Math.round(ascent)
        : null,
    source: "openrouteservice",
    attribution:
      "© openrouteservice by HeiGIT · © OpenStreetMap contributors · CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/",
    created_at: now.toISOString(),
  };
}
export function distinctRoutes(routes: SuggestedRoute[]) {
  const seen: Set<string>[] = [];
  return routes.filter((r) => {
    const cells = new Set(
      r.route.map(
        (p) =>
          `${Math.round(p.latitude * 2000)},${Math.round(p.longitude * 2000)}`,
      ),
    );
    if (
      seen.some(
        (s) =>
          [...cells].filter((cell) => s.has(cell)).length /
            Math.min(s.size, cells.size) >
          0.85,
      )
    )
      return false;
    seen.push(cells);
    return true;
  });
}
