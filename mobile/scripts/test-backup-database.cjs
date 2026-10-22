/* global __dirname */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
async function main() {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  let checks = 0;
  const check = (actual, expected) => {
    assert.deepEqual(actual, expected);
    checks++;
  };
  const denied = async (sql, params = []) => {
    await assert.rejects(() => db.query(sql, params));
    checks++;
  };
  async function as(owner) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner || "",
    ]);
    await db.exec(`set role ${owner ? "authenticated" : "anon"}`);
  }
  const workout = {
    id: "gps-1",
    ownerId: a,
    source: "gps",
    visibility: "private",
    title: "Privat tur",
    notes: "Hjemmeadresse i privat notat",
    sport: "Løping",
    distance: 1,
    seconds: 300,
    date: "2026-10-22T10:00:00Z",
    route: [
      { latitude: 59, longitude: 10 },
      { latitude: 59.01, longitude: 10, breakBefore: true },
    ],
    splits: [{ kilometer: 1, seconds: 300, elapsedSeconds: 300 }],
  };
  const insert =
    "insert into public.workout_backups(owner_id,local_id,payload) values($1,$2,$3::jsonb) on conflict(owner_id,local_id) do nothing";
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;insert into auth.users(id) values('${a}'),('${b}');`,
    );
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
    await as(null);
    await denied("select * from public.workout_backups");
    await denied(insert, [a, workout.id, JSON.stringify(workout)]);
    await as(a);
    await db.query(insert, [a, workout.id, JSON.stringify(workout)]);
    await db.query(insert, [a, workout.id, JSON.stringify(workout)]);
    check((await db.query("select payload from public.workout_backups")).rows, [
      { payload: workout },
    ]);
    check(
      (await db.query("select * from public.vyro_feed('following')")).rows,
      [],
    );
    await denied("update public.workout_backups set payload=payload");
    await denied(
      "insert into public.workout_backups(owner_id,local_id,payload,created_at) values($1,$2,$3,now())",
      [a, workout.id, workout],
    );
    await as(b);
    check((await db.query("select * from public.workout_backups")).rows, []);
    await denied(insert, [a, workout.id, workout]);
    await db.query("delete from public.workout_backups where owner_id=$1", [a]);
    await as(a);
    check(
      (await db.query("select * from public.workout_backups")).rows.length,
      1,
    );
    for (const patch of [
      { source: "simulation" },
      { source: "example" },
      { ownerId: b },
      { visibility: "public" },
      { sport: null },
      { sport: "Swimming" },
      { distance: -1 },
      { seconds: 0 },
      { date: "infinity" },
      { date: "invalid" },
      { title: null },
      { title: "" },
      { notes: null },
      {
        route: [
          { latitude: 999, longitude: 0 },
          { latitude: 0, longitude: 0 },
        ],
      },
      {
        route: [
          { latitude: 0, longitude: 0, secret: "no" },
          { latitude: 0, longitude: 0 },
        ],
      },
      { turfTrace: [] },
      { splits: null },
      { splits: [{ kilometer: 1, seconds: 999, elapsedSeconds: 999 }] },
      { splits: [{ kilometer: 2, seconds: 300, elapsedSeconds: 300 }] },
    ]) {
      const bad = { ...workout, id: "bad", ...patch };
      await denied(insert, [a, bad.id, bad]);
    }
    await denied(insert, [a, "wrong-id", workout]);
    await db.exec("delete from public.workout_backups");
    check((await db.query("select * from public.workout_backups")).rows, []);
    await db.query(insert, [a, workout.id, workout]);
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [a]);
    check((await db.query("select * from public.workout_backups")).rows, []);
    console.log(
      `${checks} private backup ownership, validation, idempotency, feed isolation and deletion checks passed.`,
    );
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
