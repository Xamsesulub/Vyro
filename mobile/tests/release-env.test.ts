const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { Buffer } = require("node:buffer");

const script = path.resolve("scripts/check-release-env.cjs");
// Synthetic format examples; never used to build or contact a real service.
const valid = {
  EXPO_PUBLIC_SUPABASE_URL: "https://release-fixture.supabase.co",
  EXPO_PUBLIC_SUPABASE_KEY: "sb_publishable_aaaaaaaaaaaaaaaaaaaa",
};
function check(env: Record<string, string>) {
  return spawnSync(process.execPath, [script], { env, encoding: "utf8" });
}

test("release fails before native compilation when login is not configured", () => {
  const result = check({});
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("EXPO_PUBLIC_SUPABASE_URL");
  expect(result.stderr).toContain("EXPO_PUBLIC_SUPABASE_KEY");
  expect(result.stderr).not.toContain("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN");
});

test("release accepts the client's supported public configuration and key alias", () => {
  expect(check(valid).status).toBe(0);
  const { EXPO_PUBLIC_SUPABASE_KEY, ...rest } = valid;
  expect(
    check({
      ...rest,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: EXPO_PUBLIC_SUPABASE_KEY,
    }).status,
  ).toBe(0);
  expect(
    check({ ...valid, EXPO_PUBLIC_SUPABASE_URL: "http://localhost:54321" })
      .status,
  ).toBe(1);
});

test("Apple Maps needs no token, while web preview validation still requires one", () => {
  expect(check(valid).status).toBe(0);
  expect(check({ ...valid, VYRO_RELEASE_PLATFORM: "web" }).status).toBe(1);
  expect(
    check({
      ...valid,
      VYRO_RELEASE_PLATFORM: "web",
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: "pk.fixture.signature",
    }).status,
  ).toBe(0);
  expect(
    check({
      ...valid,
      VYRO_RELEASE_PLATFORM: "web",
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: "pk.local_map_fixture",
    }).status,
  ).toBe(1);
});

test("release rejects exposed backend secrets without printing their values", () => {
  const jwt = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
  for (const secret of [
    "sb_secret_private-fixture",
    "sk.private-fixture",
    jwt,
  ]) {
    const result = check({ ...valid, EXPO_PUBLIC_ACCIDENTAL_SECRET: secret });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("backend secrets");
    expect(result.stderr + result.stdout).not.toContain(secret);
  }
});
