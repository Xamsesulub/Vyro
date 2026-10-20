// Read-only connectivity check. Never print credentials or response bodies.
const fs = require("node:fs");
const path = require("node:path");
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
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
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
    "No accounts created or database records changed. This does not verify application tables or RLS.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
