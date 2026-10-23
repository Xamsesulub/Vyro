// Read-only connectivity check. Never print credentials or response bodies.
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const file = path.resolve(__dirname, "../.env.local");
const values = fs.existsSync(file)
  ? Object.fromEntries(
      fs
        .readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter((line) => /^[A-Z_]+=/.test(line))
        .map((line) => {
          const at = line.indexOf("=");
          return [line.slice(0, at), line.slice(at + 1).trim()];
        }),
    )
  : {};
const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL || values.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_KEY || values.EXPO_PUBLIC_SUPABASE_KEY;
async function main() {
  if (
    !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url || "") ||
    !key?.startsWith("sb_publishable_")
  ) {
    throw new Error("Missing or invalid Supabase URL/publishable key.");
  }
  const base = url.replace(/\/$/, "");
  const response = await fetch(`${base}/auth/v1/settings`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Supabase connection failed: HTTP ${response.status}`);
  const body = await response.json();
  if (!body.external || typeof body.external.email !== "boolean") {
    throw new Error("Unexpected Auth settings response.");
  }
  console.log(
    `Supabase Auth reachable: HTTP ${response.status}. Publishable key accepted. Email auth: ${body.external.email ? "enabled" : "disabled"}.`,
  );
  console.log(
    `Signups: ${body.disable_signup ? "disabled" : "enabled"}. Email confirmation: ${body.mailer_autoconfirm ? "disabled" : "required"}.`,
  );
  for (const table of [
    "profiles",
    "follows",
    "activities",
    "posts",
    "likes",
    "comments",
    "reposts",
    "turfs",
    "turf_events",
    "turf_attempts",
    "write_limits",
  ]) {
    // limit=0 verifies permissions without fetching customer rows.
    const result = await fetch(`${base}/rest/v1/${table}?select=*&limit=0`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(15000),
    });
    assert.ok(
      [401, 403].includes(result.status),
      `${table}: expected anonymous denial, got HTTP ${result.status}`,
    );
    console.log(`Anonymous ${table}: denied (HTTP ${result.status}).`);
  }
  // A random reserved address cannot match a real user and sends no email.
  const started = performance.now();
  const rejected = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `vyro-check-${randomUUID()}@example.invalid`,
      password: randomUUID(),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const failure = await rejected.json();
  assert.equal(rejected.status, 400);
  assert.equal(failure.error_code, "invalid_credentials");
  console.log(
    `Invalid login rejected correctly in ${Math.round(performance.now() - started)} ms (one request; not a successful-login benchmark).`,
  );
  console.log(
    "No accounts, emails or training records created. Auth may log this rejected attempt. This does not verify authenticated ownership policies or successful login.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
