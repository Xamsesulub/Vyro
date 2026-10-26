/* global __dirname */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
async function main() {
  const db = new PGlite(),
    a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  let checks = 0;
  const check = (actual, expected) => {
    assert.deepEqual(actual, expected);
    checks++;
  };
  const denied = async (fn) => {
    await assert.rejects(fn);
    checks++;
  };
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;insert into auth.users values('${a}','{"display_name":"A"}'),('${b}','{"display_name":"B"}');`,
  );
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const f of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  const as = async (role, id = "") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role " + role);
  };
  const claim = async (owner, key, minute = 30, day = 600) =>
    (
      await db.query("select vyro_claim_route_search($1,$2,$3,$4) value", [
        owner,
        key,
        minute,
        day,
      ])
    ).rows[0].value;
  const finish = async (key, lease, routes) =>
    (
      await db.query("select vyro_finish_route_search($1,$2,$3::jsonb) value", [
        key,
        lease,
        routes === null ? null : JSON.stringify(routes),
      ])
    ).rows[0].value;
  const route = {
    id: "a".repeat(64),
    name: "Rundtur (test)",
    sport: "Løping",
    route: [
      { latitude: 59.9, longitude: 10.7 },
      { latitude: 59.92, longitude: 10.7 },
      { latitude: 59.9, longitude: 10.7 },
    ],
    distance_m: 5000,
    ascent_m: 20,
    source: "openrouteservice",
    attribution: "© OpenStreetMap contributors · openrouteservice / HeiGIT",
  };
  await as("anon");
  await denied(() => db.query("select * from route_suggestions"));
  await denied(() => claim(a, "v1:oslo"));
  await denied(() => db.query("select save_route_suggestion($1)", [route.id]));
  await as("authenticated", a);
  await denied(() => claim(a, "v1:oslo"));
  await denied(() => db.query("select * from route_search_cache"));
  await denied(() => db.query("select * from route_generation_requests"));
  await denied(() =>
    db.query(
      "insert into saved_route_suggestions(owner_id,route_id) values($1,$2)",
      [b, route.id],
    ),
  );
  await as("service_role");
  const first = await claim(a, "v1:oslo");
  check(first.state, "generate");
  check((await claim(b, "v1:oslo")).state, "pending");
  await denied(() =>
    finish("v1:oslo", "00000000-0000-0000-0000-000000000000", [route]),
  );
  const published = await finish("v1:oslo", first.lease, [route]);
  check(published.length, 1);
  check(published[0].route, route.route);
  const cached = await claim(b, "v1:oslo");
  check(cached.state, "ready");
  check(cached.routes[0].id, route.id);
  await denied(() => claim(a, "v1:budget", 30, 3));
  await denied(() => claim(a, "v1:invalid-budget", null, null));
  const retry = await claim(a, "v1:failure");
  await finish("v1:failure", retry.lease, null);
  check((await claim(a, "v1:failure")).state, "generate");
  await as("authenticated", a);
  await denied(() => db.query("update route_suggestions set name='spoof'"));
  await db.query("select save_route_suggestion($1)", [route.id]);
  await db.query("select save_route_suggestion($1)", [route.id]);
  await db.query("select save_route_suggestion($1,$2)", [
    route.id,
    "Privat navn ved nytt forsøk",
  ]);
  check(
    (await db.query("select name from saved_route_suggestions")).rows[0].name,
    "Privat navn ved nytt forsøk",
  );
  check(
    (await db.query("select name from route_suggestions")).rows[0].name,
    route.name,
  );
  check(
    (await db.query("select * from saved_route_suggestions")).rows.length,
    1,
  );
  await denied(() =>
    db.query("select save_route_suggestion($1)", ["f".repeat(64)]),
  );
  await as("authenticated", b);
  check(
    (await db.query("select * from saved_route_suggestions")).rows.length,
    0,
  );
  check((await db.query("select * from route_suggestions")).rows.length, 1);
  await db.query("select save_route_suggestion($1)", [route.id]);
  check(
    (await db.query("select owner_id from saved_route_suggestions")).rows[0]
      .owner_id,
    b,
  );
  check(
    (
      await db.query(
        "delete from saved_route_suggestions where owner_id=$1 returning route_id",
        [a],
      )
    ).rows.length,
    0,
  );
  await as("authenticated", a);
  check(
    (
      await db.query(
        "select r.route from saved_route_suggestions s join route_suggestions r on r.id=s.route_id",
      )
    ).rows[0].route,
    route.route,
  );
  await as("service_role");
  for (let i = 0; i < 3; i++) await claim(a, "v1:oslo");
  await denied(() => claim(a, "v1:oslo"));
  await db.exec("reset role");
  await db.query(
    "update route_suggestions set created_at=now()-interval '40 days'",
  );
  await db.query(
    "update route_search_cache set lease=null,lease_until=null,expires_at=null,updated_at=now()-interval '3 days'",
  );
  await as("service_role");
  await db.query("select vyro_prune_route_suggestions()");
  await as("authenticated", a);
  check((await db.query("select * from route_suggestions")).rows.length, 1);
  await db.query("delete from saved_route_suggestions");
  await as("authenticated", b);
  await db.query("delete from saved_route_suggestions");
  await as("service_role");
  await db.query("select vyro_prune_route_suggestions()");
  await as("authenticated", a);
  check((await db.query("select * from route_suggestions")).rows.length, 0);
  await db.close();
  console.log(
    `${checks} route database checks passed (isolated PGlite; no production writes).`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
