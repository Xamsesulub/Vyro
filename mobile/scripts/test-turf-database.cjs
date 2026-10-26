/* global __dirname */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
async function main() {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  let checks = 0;
  const check = (actual, expected) => {
    assert.deepEqual(actual, expected);
    checks++;
  };
  const denied = async (fn, reason) => {
    await assert.rejects(fn, reason ? new RegExp(reason) : undefined);
    checks++;
  };
  await db.exec(`
    create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;
    insert into auth.users values('${a}','{"display_name":"Alice test"}'),('${b}','{"display_name":"Bob test"}');
  `);
  for (const f of fs
    .readdirSync(path.resolve(__dirname, "../../supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(
      fs.readFileSync(
        path.resolve(__dirname, "../../supabase/migrations", f),
        "utf8",
      ),
    );
  async function as(id) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  }
  const stamp = Date.now() - 3600000;
  const trace = (count, step) =>
    Array.from({ length: count }, (_, i) => ({
      latitude: 59.9 + i * 0.0002,
      longitude: 10.7,
      accuracy: 5,
      timestamp: stamp + i * step,
    }));
  const submit = async (
    local,
    samples,
    id = null,
    revision = null,
    extend = false,
    source = "gps",
  ) =>
    (
      await db.query(
        "select public.submit_turf_run($1,'Testløypa',$2,'Løping',$3::jsonb,$4,$5,$6) as result",
        [local, source, JSON.stringify(samples), id, revision, extend],
      )
    ).rows[0].result;
  await as(null);
  await denied(() => submit("anon", trace(21, 6250)));
  await denied(() => db.query("select * from turfs"));
  await as(a);
  await denied(
    () => submit("sim", trace(21, 6250), null, null, false, "simulation"),
    "TURF_GPS_REQUIRED",
  );
  const created = await submit("first", trace(21, 6250));
  check(created.won, true);
  check(created.target_seconds, 125);
  const original = (await db.query("select * from turfs")).rows[0];
  check(
    original.route.every((p) => !("timestamp" in p) && !("accuracy" in p)),
    true,
  );
  await denied(() => db.query("update turfs set seconds=1"));
  await denied(() =>
    db.query(
      "insert into turf_events(turf_id,actor_id,revision,extended,distance_m,seconds) values($1,$2,1,true,999,1)",
      [created.turf_id, a],
    ),
  );
  await as(b);
  await denied(
    () =>
      submit(
        "reverse",
        trace(21, 5000).map((p, i, arr) => ({
          ...arr[arr.length - 1 - i],
          timestamp: p.timestamp,
        })),
        created.turf_id,
        1,
      ),
    "TURF_WRONG_ROUTE",
  );
  await denied(
    () =>
      submit(
        "shortcut",
        trace(21, 5000).filter((_, i) => i % 2 === 0),
        created.turf_id,
        1,
      ),
    "TURF_GPS_GAP",
  );
  await denied(
    () =>
      submit(
        "bad",
        trace(21, 5000).map((p) => ({ ...p, accuracy: 90 })),
        created.turf_id,
        1,
      ),
    "TURF_INVALID",
  );
  await denied(
    () => submit("slower", trace(31, 7000), created.turf_id, 1, true),
    "TURF_NOT_FASTER",
  );
  await denied(
    () => submit("tiny-extension", trace(23, 5000), created.turf_id, 1, true),
    "TURF_EXTENSION_SHORT",
  );
  const won = await submit("winner", trace(31, 5000), created.turf_id, 1, true);
  check(won.won, true);
  check(won.extended, true);
  check(won.seconds, 100);
  check(won.target_seconds, 150);
  check(won.revision, 2);
  const grown = (await db.query("select * from turfs")).rows[0];
  check(grown.owner_id, b);
  check(grown.route.slice(0, original.route.length), original.route);
  check(grown.distance_m > original.distance_m + 100, true);
  check(await submit("winner", trace(31, 5000), created.turf_id, 1, true), won);
  check((await db.query("select * from turf_events")).rows.length, 2);
  check((await db.query("select * from turf_attempts")).rows.length, 1);
  await as(a);
  await denied(
    () => submit("stale", trace(31, 4000), created.turf_id, 1, false),
    "TURF_CHANGED",
  );
  await denied(
    () => submit("old-course", trace(21, 4000), created.turf_id, 2, false),
    "TURF_WRONG_ROUTE",
  );
  const tied = await submit("tie", trace(31, 5000), created.turf_id, 2, false);
  check(tied.won, false);
  check((await db.query("select owner_id from turfs")).rows[0].owner_id, b);
  const takeover = await submit(
    "full-course",
    trace(31, 4000),
    created.turf_id,
    2,
    false,
  );
  check(takeover.won, true);
  check(takeover.extended, false);
  check(takeover.target_seconds, 120);
  check((await db.query("select route from turfs")).rows[0].route, grown.route);
  await as(b);
  check((await db.query("delete from turfs returning id")).rows.length, 0);
  await as(a);
  check((await db.query("delete from turfs returning id")).rows.length, 1);
  check((await db.query("select * from turf_events")).rows.length, 0);
  await db.close();
  console.log(
    `${checks} turf database checks passed (isolated PGlite; no production writes).`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
