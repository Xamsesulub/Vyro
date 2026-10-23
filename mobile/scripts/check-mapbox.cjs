// Read-only diagnostics: one request per resource, no retry or credential logging.
const path = require("node:path");

async function checkMapbox({ token, origin, fetchImpl = fetch }) {
  if (!/^pk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token ?? ""))
    return [
      { resource: "configuration", ok: false, reason: "missing-public-token" },
    ];
  const headers = {};
  if (origin) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      /* Report without echoing input. */
    }
    if (
      !parsed ||
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      return [
        { resource: "configuration", ok: false, reason: "invalid-origin" },
      ];
    headers.Origin = parsed.origin;
    headers.Referer = `${parsed.origin}/`;
  }
  const results = [];
  async function probe(resource, pathname, kind) {
    try {
      const url = new URL(pathname, "https://api.mapbox.com");
      url.searchParams.set("access_token", token);
      const response = await fetchImpl(url.toString(), {
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      const result = { resource, status: response.status, ok: false };
      if (!response.ok) {
        result.reason =
          response.status === 429
            ? "rate-limited"
            : [401, 403].includes(response.status)
              ? "access-denied"
              : "http-error";
        const retryAfter = response.headers.get("retry-after");
        if (/^\d+$/.test(retryAfter ?? ""))
          result.retryAfterSeconds = Number(retryAfter);
        const rateLimit = {};
        for (const [header, field] of [
          ["x-rate-limit-limit", "limit"],
          ["x-rate-limit-remaining", "remaining"],
          ["x-rate-limit-interval", "intervalSeconds"],
          ["x-rate-limit-reset", "resetUnixSeconds"],
        ]) {
          const value = response.headers.get(header);
          if (/^\d+$/.test(value ?? "")) rateLimit[field] = Number(value);
        }
        if (Object.keys(rateLimit).length) result.rateLimit = rateLimit;
        // Do not print provider response bodies: they can contain the request URL.
        await response.body?.cancel();
      } else {
        const data = Buffer.from(await response.arrayBuffer());
        if (kind === "image") {
          result.ok =
            response.headers.get("content-type")?.startsWith("image/jpeg") ===
              true &&
            data[0] === 0xff &&
            data[1] === 0xd8 &&
            data[2] === 0xff;
        } else {
          const json = JSON.parse(data.toString());
          result.ok =
            kind === "style"
              ? json.version === 8
              : Array.isArray(json.tiles) && json.tiles.length > 0;
        }
        if (!result.ok) result.reason = "unexpected-content";
      }
      results.push(result);
      return result.ok;
    } catch {
      results.push({
        resource,
        ok: false,
        reason: "network-or-invalid-response",
      });
      return false;
    }
  }
  if (!(await probe("standard-style", "/styles/v1/mapbox/standard", "style")))
    return results;
  if (
    !(await probe(
      "satellite-style",
      "/styles/v1/mapbox/standard-satellite",
      "style",
    ))
  )
    return results;
  if (
    !(await probe(
      "satellite-tilejson",
      "/v4/mapbox.satellite.json",
      "tilejson",
    ))
  )
    return results;
  // Fixed public Oslo location; no user location, account or workout is sent.
  const z = 12;
  const x = Math.floor(((10.7522 + 180) / 360) * 2 ** z);
  const y = Math.floor(
    ((1 - Math.asinh(Math.tan((59.9139 * Math.PI) / 180)) / Math.PI) / 2) *
      2 ** z,
  );
  await probe(
    "satellite-image",
    `/v4/mapbox.satellite/${z}/${x}/${y}.jpg90`,
    "image",
  );
  return results;
}

if (require.main === module) {
  const { loadProjectEnv } = require("@expo/env");
  loadProjectEnv(path.join(__dirname, ".."), {
    mode: "development",
    silent: true,
  });
  checkMapbox({
    token: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim(),
    origin: process.env.VYRO_MAP_CHECK_ORIGIN,
  })
    .then((results) => {
      console.log(JSON.stringify(results, null, 2));
      if (results.some((r) => !r.ok)) {
        console.error(
          "Kartkontrollen feilet. Se docs/mapbox-setup.md. Ingen nøkkelverdier er skrevet ut.",
        );
        process.exitCode = 1;
      } else {
        console.log(
          "Stiler, kildebeskrivelse og én ekte satellittflis er tilgjengelige. Kontroller også kartet visuelt.",
        );
      }
    })
    .catch(() => {
      console.error("Kartkontrollen kunne ikke kjøres.");
      process.exitCode = 1;
    });
}
module.exports = { checkMapbox };
