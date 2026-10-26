import { webcrypto } from "node:crypto";
import {
  createRouteHandler,
  type Environment,
} from "../../supabase/functions/route-suggestions/handler";
import {
  distinctRoutes,
  meters,
  parseProvider,
  parseQuery,
  providerRequest,
  queryKey,
} from "../../supabase/functions/route-suggestions/model";
const env: Environment = {
  url: "https://fixture.supabase.co",
  anonKey: "public-fixture",
  serviceKey: "server-only-fixture",
  orsKey: "provider-only-fixture",
};
const center = {
  latitude: 59.9123,
  longitude: 10.7512,
  sport: "Løping" as const,
  length: 5000,
};
function loop(latitude = 59.912, longitude = 10.752) {
  const coordinates = Array.from({ length: 81 }, (_, i) => {
    const angle = (i / 80) * Math.PI * 2,
      r = 5000 / (2 * Math.PI);
    return [
      longitude +
        (r * Math.sin(angle)) / (111195 * Math.cos((latitude * Math.PI) / 180)),
      latitude + (r * (1 - Math.cos(angle))) / 111195,
      50,
    ];
  });
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: { summary: { distance: 5000 }, ascent: 42 },
      },
    ],
  };
}
const response = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const request = (body: unknown = center, token = "valid-user") =>
  new Request("https://fixture/functions/v1/route-suggestions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
let calls: { url: string; headers: Headers; body: any }[];
let custom: (url: string, body: any) => Response | undefined;
beforeEach(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
  calls = [];
  custom = () => undefined;
});
const fetcher = (async (input, init) => {
  const url = String(input),
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
  calls.push({ url, body, headers: new Headers(init?.headers) });
  const override = custom(url, body);
  if (override) return override;
  if (url.endsWith("/auth/v1/user"))
    return response({ id: "authenticated-owner" });
  if (url.endsWith("vyro_claim_route_search"))
    return response({ state: "generate", lease: "lease-token" });
  if (url.endsWith("vyro_finish_route_search"))
    return response(body.p_routes ?? []);
  if (url.includes("openrouteservice.org")) return response(loop());
  throw new Error("Unexpected URL");
}) as typeof fetch;
test.each([
  ["Oslo", 59.91, 10.75],
  ["Bergen", 60.39, 5.32],
  ["Trondheim", 63.43, 10.4],
  ["Tromsø", 69.65, 18.96],
  ["Kristiansand", 58.15, 8.0],
  ["Alta", 69.97, 23.27],
  ["Kirkenes", 69.73, 30.04],
  ["Røros", 62.57, 11.38],
  ["Svalbard", 78.22, 15.63],
  ["Jan Mayen", 70.92, -8.72],
])(
  "the service envelope accepts %s without a city-specific catalogue",
  (_, latitude, longitude) => {
    expect(parseQuery({ ...center, latitude, longitude })).toMatchObject({
      sport: "Løping",
      length: 5000,
    });
  },
);
test("validation rejects malformed/out-of-region requests and rounds GPS before building the cache key", () => {
  for (const value of [
    null,
    { ...center, latitude: NaN },
    { ...center, latitude: 0 },
    { ...center, length: 999999 },
    { ...center, sport: "Sykling" },
    { ...center, longitude: "10" },
  ])
    expect(() => parseQuery(value)).toThrow();
  const q = parseQuery(center);
  expect(q.latitude).toBe(59.912);
  expect(q.longitude).toBe(10.752);
  expect(queryKey(q)).not.toContain("9123");
  expect(providerRequest(q, 1)).toMatchObject({
    coordinates: [[10.752, 59.912]],
    options: {
      avoid_features: ["ferries", "fords"],
      round_trip: { length: 5000, points: 3, seed: 1 },
    },
  });
});
test("route normalization checks shape, location, distance and loop closure and removes provider metadata", async () => {
  const q = parseQuery(center),
    r = await parseProvider(loop(), q);
  expect(r?.id).toMatch(/^[a-f0-9]{64}$/);
  expect(r?.ascent_m).toBe(42);
  expect(r?.route[0]).not.toHaveProperty("timestamp");
  expect(await parseProvider(loop(65, 15), q)).toBeNull();
  const bad = loop();
  bad.features[0].geometry.coordinates[0][0] = NaN;
  expect(await parseProvider(bad, q)).toBeNull();
  const open = loop();
  open.features[0].geometry.coordinates.pop();
  open.features[0].geometry.coordinates.pop();
  expect(await parseProvider(open, q)).toBeNull();
  const short = loop();
  short.features[0].properties.summary.distance = 10;
  expect(await parseProvider(short, q)).toBeNull();
  expect(distinctRoutes([r!, r!])).toHaveLength(1);
  expect(meters(r!.route[0], q)).toBeLessThan(1000);
});
test("only validated auth identity can claim work; user credentials never reach the routing provider", async () => {
  const res = await createRouteHandler(
    env,
    fetcher,
  )(request({ ...center, ownerId: "attacker" }));
  expect(res.status).toBe(200);
  const payload = await res.json();
  expect(payload.routes).toHaveLength(1);
  expect(
    calls.find((c) => c.url.endsWith("vyro_claim_route_search"))?.body.p_owner,
  ).toBe("authenticated-owner");
  const provider = calls.filter((c) => c.url.includes("openrouteservice.org"));
  expect(provider).toHaveLength(3);
  provider.forEach((c) => {
    expect(c.headers.get("Authorization")).toBe(env.orsKey);
    expect(c.body).not.toHaveProperty("ownerId");
    expect(c.body.coordinates).toEqual([[10.752, 59.912]]);
  });
  expect(JSON.stringify(payload)).not.toContain(env.serviceKey);
  expect(JSON.stringify(payload)).not.toContain(env.orsKey!);
});
test("unauthenticated calls, missing configuration and invalid inputs do not spend the provider quota", async () => {
  custom = (url) =>
    url.endsWith("/auth/v1/user") ? response({}, 401) : undefined;
  expect((await createRouteHandler(env, fetcher)(request())).status).toBe(401);
  custom = () => undefined;
  expect(
    (
      await createRouteHandler(
        { ...env, orsKey: undefined },
        fetcher,
      )(request())
    ).status,
  ).toBe(503);
  expect(
    (await createRouteHandler(env, fetcher)(request({ ...center, length: -1 })))
      .status,
  ).toBe(400);
  expect(calls.some((c) => c.url.includes("openrouteservice.org"))).toBe(false);
});
test.each(["ready", "pending"])(
  "a %s cache avoids duplicate provider calls",
  async (state) => {
    custom = (url) =>
      url.endsWith("vyro_claim_route_search")
        ? response({ state, routes: [] })
        : undefined;
    const res = await createRouteHandler(env, fetcher)(request());
    expect(res.status).toBe(state === "ready" ? 200 : 409);
    expect(calls.some((c) => c.url.includes("openrouteservice.org"))).toBe(
      false,
    );
  },
);
test("database rate limits stop generation and provider failures release the lease without caching false results", async () => {
  custom = (url) =>
    url.endsWith("vyro_claim_route_search")
      ? response({ message: "ROUTE_RATE_LIMIT" }, 400)
      : undefined;
  expect((await createRouteHandler(env, fetcher)(request())).status).toBe(429);
  expect(calls.some((c) => c.url.includes("openrouteservice.org"))).toBe(false);
  calls = [];
  custom = (url) =>
    url.includes("openrouteservice.org")
      ? response({ message: "quota" }, 429)
      : undefined;
  const res = await createRouteHandler(env, fetcher)(request());
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ code: "PROVIDER_BUSY" });
  expect(
    calls.find((c) => c.url.endsWith("vyro_finish_route_search"))?.body
      .p_routes,
  ).toBeNull();
});
test("no routable start is an honest empty result, and CORS preflight makes no auth/provider request", async () => {
  custom = (url) =>
    url.includes("openrouteservice.org")
      ? response({ error: { code: 2010 } }, 404)
      : undefined;
  const handler = createRouteHandler(env, fetcher);
  expect(await (await handler(request())).json()).toEqual({
    routes: [],
    cached: false,
  });
  calls = [];
  expect(
    (await handler(new Request("https://fixture", { method: "OPTIONS" })))
      .status,
  ).toBe(204);
  expect(calls).toHaveLength(0);
});
