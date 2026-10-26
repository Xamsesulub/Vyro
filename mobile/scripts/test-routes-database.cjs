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
  const check = (v, e) => {
    assert.deepEqual(v, e);
    checks++;
  };
  const denied = async (sql, args = [], message) => {
    try {
      await assert.rejects(
        () => db.query(sql, args),
        message ? new RegExp(message) : undefined,
      );
    } catch (e) {
      throw new Error(sql + " [" + args[0] + "] " + e.message);
    }
    checks++;
  };
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;insert into auth.users values('${a}','{}'),('${b}','{}');`,
  );
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const f of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    // A real legacy bookmark must survive the replacement migration.
    if (f === "202610260002_community_routes.sql") {
      await db.exec(
        `insert into route_suggestions(id,name,sport,route,distance_m,source,attribution) values(repeat('a',64),'Legacy','Løping','[{"latitude":59.9,"longitude":10.7},{"latitude":59.92,"longitude":10.7}]',2200,'openrouteservice','Legacy attribution'),(repeat('b',64),'Unused','Løping','[{"latitude":59.9,"longitude":10.7},{"latitude":59.92,"longitude":10.7}]',2200,'openrouteservice','Legacy attribution'); select set_config('request.jwt.claim.sub','${a}',false);insert into saved_route_suggestions(owner_id,route_id,name) values('${a}',repeat('a',64),'My legacy');`,
      );
    }
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  }
  const as = async (role, id = "") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role " + role);
  };
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;
  const line = (lat = 59.9, lon = 10.7) =>
    Array.from({ length: 101 }, (_, i) => ({
      latitude: lat + i * 0.00025,
      longitude: lon,
    }));
  const route = line(),
    shareSql = "select contribute_route($1,$2,$3,$4,$5::jsonb,$6,$7) id";
  const payload = (id = "trip-a", r = route) => [
    id,
    "Elveløypa",
    "Oslo",
    "Løping",
    JSON.stringify(r),
    "gps",
    true,
  ];
  const search = (lat = 59.91, lon = 10.7, length = 0) =>
    query("select * from search_community_routes($1,$2,'Løping',$3)", [
      lat,
      lon,
      length,
    ]);
  await as("anon");
  await denied("select * from route_suggestions");
  await denied(shareSql, payload());
  await denied("select * from search_community_routes(59.9,10.7,'Løping',0)");
  await as("authenticated", a);
  check((await search()).length, 0);
  check(
    (await query("select name from route_suggestions")).map((r) => r.name),
    ["Legacy"],
  );
  await denied(
    shareSql,
    [...payload().slice(0, 6), false],
    "ROUTE_CONSENT_REQUIRED",
  );
  await denied(
    shareSql,
    [...payload().slice(0, 5), "simulation", true],
    "ROUTE_INVALID",
  );
  await denied(shareSql, payload("short", route.slice(0, 3)), "ROUTE_INVALID");
  await denied(
    shareSql,
    payload(
      "metadata",
      route.map((p) => ({ ...p, timestamp: 123 })),
    ),
    "ROUTE_INVALID",
  );
  await denied(
    shareSql,
    payload(
      "broken",
      route.map((p) => ({ ...p, breakBefore: true })),
    ),
    "ROUTE_INVALID",
  );
  await denied("insert into route_suggestions(id) values('spoof')");
  await denied("select * from route_similarity_points");
  const id = (await query(shareSql, payload()))[0].id;
  check(id.length, 64);
  check((await query(shareSql, payload()))[0].id, id); // retry after lost response
  check((await search()).length, 1);
  check(Math.abs(Number((await search())[0].distance_m) - 2780) < 5, true);
  check((await search(60.39, 5.32)).length, 0); // another city
  check((await search(59.91, 10.7, 15000)).length, 0);
  await denied(
    "select * from search_community_routes('NaN',10.7,'Løping',0)",
    [],
    "INVALID_QUERY",
  );
  await query("select save_route_suggestion($1,$2)", [id, "Min løype"]);
  await as("authenticated", b);
  check(
    (await query("select name from route_suggestions")).map((r) => r.name),
    ["Elveløypa"],
  );
  check((await query("select * from route_contributions")).length, 0);
  await denied(
    "select save_route_suggestion(repeat('a',64))",
    [],
    "ROUTE_NOT_FOUND",
  );
  await denied("select withdraw_route($1)", [id], "ROUTE_NOT_FOUND");
  await denied(shareSql, payload("exact"), "ROUTE_DUPLICATE");
  await denied(
    shareSql,
    payload("reverse", [...route].reverse()),
    "ROUTE_DUPLICATE",
  );
  await denied(
    shareSql,
    payload(
      "jitter",
      route.map((p, i) => ({
        ...p,
        longitude: p.longitude + (i % 2 ? 0.0002 : -0.0002),
      })),
    ),
    "ROUTE_DUPLICATE",
  );
  await denied(
    shareSql,
    payload(
      "sparse",
      route.filter((_, i) => i % 4 === 0),
    ),
    "ROUTE_DUPLICATE",
  );
  await query("select save_route_suggestion($1)", [id]);
  // A nearby parallel route >45m away is distinct; different shape is distinct.
  const distinct = (
    await query(shareSql, payload("parallel", line(59.9, 10.704)))
  )[0].id;
  check(typeof distinct, "string");
  const cross = (
    await query(
      shareSql,
      payload(
        "cross",
        route.map((p, i) => ({
          latitude: 59.9125,
          longitude: 10.675 + i * 0.0005,
        })),
      ),
    )
  )[0].id;
  check(typeof cross, "string");
  // Cyclic start and direction are not identifiers.
  const circle = Array.from({ length: 161 }, (_, i) => ({
    latitude: 59.94 + 0.01 * Math.cos((i * Math.PI * 2) / 160),
    longitude: 10.75 + 0.02 * Math.sin((i * Math.PI * 2) / 160),
  }));
  const loop = (await query(shareSql, payload("loop", circle)))[0].id;
  const rotated = [...circle.slice(50, 160), ...circle.slice(0, 51)];
  await as("authenticated", a);
  await denied(shareSql, payload("same-loop", rotated), "ROUTE_DUPLICATE");
  check((await query("select * from workout_backups")).length, 0); // not a backup/upload of private trace
  await query("select withdraw_route($1)", [id]);
  check(
    (
      await query(
        "select route_id from saved_route_suggestions where route_id=$1",
        [id],
      )
    ).length,
    0,
  );
  await as("authenticated", b);
  check(
    (
      await query(
        "select route_id from saved_route_suggestions where route_id=$1",
        [id],
      )
    ).length,
    0,
  );
  check(
    (await query("select id from route_suggestions where id=$1", [id])).length,
    0,
  );
  await query("select withdraw_route($1)", [loop]);
  // Old generator is gone, old cron callback cannot delete community contributions.
  await as("service_role");
  await denied("select vyro_claim_route_search($1,'old')", [a]);
  await query("select vyro_prune_route_suggestions()");
  await as("authenticated", b);
  check((await search()).length, 2);
  await db.close();
  console.log(`${checks} community-route database checks passed`);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
