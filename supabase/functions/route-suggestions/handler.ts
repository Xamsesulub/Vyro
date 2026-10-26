import {
  distinctRoutes,
  parseProvider,
  parseQuery,
  providerRequest,
  queryKey,
  RouteError,
} from "./model.ts";
export type Environment = {
  url: string;
  anonKey: string;
  serviceKey: string;
  orsKey?: string;
  perMinute?: number;
  perDay?: number;
};
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
async function json(response: Response, limit: number) {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > limit) throw new RouteError("RESPONSE_TOO_LARGE", 502);
    return JSON.parse(text);
  }
  let size = 0,
    text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new RouteError("RESPONSE_TOO_LARGE", 502);
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    await reader.cancel();
  }
}
export function createRouteHandler(
  env: Environment,
  fetcher: typeof fetch = fetch,
) {
  async function request(url: string, init: RequestInit, timeout = 8000) {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), timeout);
    try {
      const response = await fetcher(url, { ...init, signal: control.signal });
      const data = await json(response, 2500000);
      return { ok: response.ok, status: response.status, data };
    } finally {
      clearTimeout(timer);
    }
  }
  async function rpc(name: string, body: unknown) {
    const res = await request(`${env.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: env.serviceKey,
        Authorization: `Bearer ${env.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const value = res.data;
    if (!res.ok) {
      if (["PGRST202", "PGRST205", "42P01"].includes(value.code))
        throw new RouteError("ROUTES_NOT_CONFIGURED", 503);
      if (value.message?.includes("ROUTE_PROVIDER_BUDGET"))
        throw new RouteError("PROVIDER_BUSY", 503);
      if (value.message?.includes("ROUTE_RATE_LIMIT"))
        throw new RouteError("RATE_LIMIT", 429);
      throw new RouteError("SERVICE_UNAVAILABLE", 503);
    }
    return value;
  }
  return async (req: Request): Promise<Response> => {
    const reply = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST")
      return reply({ code: "METHOD_NOT_ALLOWED" }, 405);
    let lease: { key: string; token: string } | undefined;
    try {
      const authorization = req.headers.get("Authorization") ?? "";
      if (!/^Bearer \S+$/i.test(authorization))
        throw new RouteError("AUTH_REQUIRED", 401);
      if (!env.url || !env.anonKey || !env.serviceKey)
        throw new RouteError("SERVICE_UNAVAILABLE", 503);
      const auth = await request(`${env.url}/auth/v1/user`, {
        headers: { Authorization: authorization, apikey: env.anonKey },
      });
      if (!auth.ok) throw new RouteError("AUTH_REQUIRED", 401);
      const user = auth.data;
      if (typeof user.id !== "string")
        throw new RouteError("AUTH_REQUIRED", 401);
      let raw: unknown;
      try {
        raw = await json(new Response(req.body), 2048);
      } catch {
        throw new RouteError("INVALID_QUERY");
      }
      const query = parseQuery(raw);
      if (!env.orsKey) throw new RouteError("ROUTES_NOT_CONFIGURED", 503);
      const key = queryKey(query);
      const claim = await rpc("vyro_claim_route_search", {
        p_owner: user.id,
        p_key: key,
        p_minute: env.perMinute ?? 30,
        p_day: env.perDay ?? 600,
      });
      if (claim.state === "ready")
        return reply({ routes: claim.routes, cached: true });
      if (claim.state === "pending")
        return reply({ code: "SEARCH_PENDING" }, 409);
      if (claim.state !== "generate" || !claim.lease)
        throw new RouteError("SERVICE_UNAVAILABLE", 503);
      lease = { key, token: claim.lease };
      const profile = query.sport === "Fottur" ? "foot-hiking" : "foot-walking";
      const attempts = await Promise.allSettled(
        [1, 11, 23].map(async (seed) => {
          const res = await request(
            `https://api.heigit.org/openrouteservice/v2/directions/${profile}/geojson`,
            {
              method: "POST",
              headers: {
                Authorization: env.orsKey!,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(providerRequest(query, seed)),
            },
            10000,
          );
          if (!res.ok) {
            if (res.status === 429) throw new RouteError("PROVIDER_BUSY", 503);
            if (res.status === 401 || res.status === 403)
              throw new RouteError("ROUTES_NOT_CONFIGURED", 503);
            const error = res.data;
            if ([2009, 2010].includes(error?.error?.code)) return null; // no suitable routable start/loop
            throw new RouteError("PROVIDER_UNAVAILABLE", 503);
          }
          return parseProvider(res.data, query);
        }),
      );
      const routes = distinctRoutes(
        attempts.flatMap((r) =>
          r.status === "fulfilled" && r.value ? [r.value] : [],
        ),
      );
      const failed = attempts.find((r) => r.status === "rejected");
      if (!routes.length && failed?.status === "rejected") throw failed.reason;
      const saved = await rpc("vyro_finish_route_search", {
        p_key: key,
        p_lease: lease.token,
        p_routes: routes,
      });
      lease = undefined;
      return reply({ routes: saved, cached: false });
    } catch (error) {
      if (lease) {
        try {
          await rpc("vyro_finish_route_search", {
            p_key: lease.key,
            p_lease: lease.token,
            p_routes: null,
          });
        } catch {
          /* lease expires automatically */
        }
      }
      return reply(
        {
          code:
            error instanceof RouteError ? error.code : "SERVICE_UNAVAILABLE",
        },
        error instanceof RouteError ? error.status : 503,
      );
    }
  };
}
