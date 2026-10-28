/* global __dirname */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

async function main() {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  let checks = 0;
  const check = (actual, expected) => {
    assert.deepEqual(actual, expected);
    checks++;
  };
  const denied = async (sql, args) => {
    await assert.rejects(() => db.query(sql, args));
    checks++;
  };
  async function as(id) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  }
  const route = [
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.91, longitude: 10.71 },
  ];
  const timer = {
    id: "timer-yoga",
    ownerId: owner,
    source: "timer",
    visibility: "private",
    title: "Yoga",
    notes: "Mitt private notat",
    sport: "Yoga",
    distance: 0,
    seconds: 1800,
    date: "2026-10-28T12:00:00Z",
    route: [],
    workoutType: "Rolig økt",
    effort: 3,
  };
  const valid = async (payload, user = owner) =>
    (
      await db.query(
        "select public.valid_vyro_backup($1::jsonb,$2::uuid,$3) as valid",
        [JSON.stringify(payload), user, payload.id],
      )
    ).rows[0].valid;
  const publish =
    "select public.publish_workout($1,$2,$3,$4,$5,now(),$6,$7::jsonb,$8) as id";
  const args = [
    timer.id,
    timer.title,
    timer.sport,
    0,
    1800,
    "timer",
    "[]",
    "followers",
  ];
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      insert into auth.users(id) values('${owner}'),('${other}');`);
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    for (const file of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
    await as(owner);
    const catalog = fs.readFileSync(
      path.resolve(__dirname, "../src/features/activities/sports.ts"),
      "utf8",
    );
    const sports = [...catalog.matchAll(/^\s+([^ :]+): \{\s*group:/gm)].map(
      (m) => m[1],
    );
    assert.ok(sports.length >= 30);
    for (const sport of sports) {
      check(await valid({ ...timer, sport }), true);
      check(
        await valid({ ...timer, sport, source: "gps", distance: 2, route }),
        true,
      );
    }
    for (const change of [
      { source: "simulation" },
      { source: "example" },
      { source: null },
      { sport: "Unknown" },
      { distance: 0.5 },
      { distance: -1 },
      { route },
      { route: null },
      { seconds: 0 },
      { maxSpeedKmh: 20 },
      { splits: [{ kilometer: 1, seconds: 300, elapsedSeconds: 300 }] },
      { effort: 0 },
      { effort: 11 },
      { effort: 1.5 },
      { effort: "4" },
      { effort: null },
      { workoutType: "invented" },
      { workoutType: null },
      { token: "not-allowed" },
    ])
      check(await valid({ ...timer, ...change }), false);
    check(await valid(timer, other), false);
    check(await valid({ ...timer, source: "gps" }), false);
    await db.query(
      "insert into public.workout_backups(owner_id,local_id,payload) values($1,$2,$3::jsonb)",
      [owner, timer.id, JSON.stringify(timer)],
    );
    check(
      (
        await db.query(
          "select payload from public.workout_backups where local_id=$1",
          [timer.id],
        )
      ).rows[0].payload,
      timer,
    );
    await denied(publish, [...args.slice(0, 3), 1, ...args.slice(4)]);
    await denied(publish, [
      ...args.slice(0, 6),
      JSON.stringify(route),
      args[7],
    ]);
    await denied(publish, [
      ...args.slice(0, 5),
      "simulation",
      ...args.slice(6),
    ]);
    const post = (await db.query(publish, args)).rows[0].id;
    check((await db.query(publish, args)).rows[0].id, post);
    const snapshot = (
      await db.query(
        "select to_jsonb(p) as data from public.posts p where id=$1",
        [post],
      )
    ).rows[0].data;
    check(snapshot.author_id, owner);
    check(snapshot.route, []);
    check(snapshot.distance_km, 0);
    for (const key of ["notes", "effort", "workoutType"])
      check(key in snapshot, false);
    await as(other);
    check(
      (await db.query("select * from public.workout_backups")).rows.length,
      0,
    );
    check(
      (await db.query("select * from public.posts where id=$1", [post])).rows
        .length,
      0,
    );
    await denied(
      "insert into public.workout_backups(owner_id,local_id,payload) values($1,$2,$3::jsonb)",
      [owner, "timer-forged", JSON.stringify({ ...timer, id: "timer-forged" })],
    );
    await as(null);
    await denied(publish, args);
    console.log(
      `Sports database: ${checks} checks passed across ${sports.length} sports.`,
    );
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
