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
  const check = (value, expected) => {
    assert.deepEqual(value, expected);
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
  const sql =
    "select public.publish_football_workout($1,'Fotball',$2,3.57,5277,now(),$3,$4::jsonb,$5,$6) as id";
  const route = [
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.9005, longitude: 10.7005 },
  ];
  const args = [
    "gps-ball",
    "Fotball",
    "gps",
    JSON.stringify(route),
    "followers",
    21.6,
  ];
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      insert into auth.users(id) values('${a}'),('${b}');`);
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    for (const file of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
    await as(null);
    await denied(sql, args);
    await as(a);
    for (const speed of [-1, 55, "NaN", "Infinity"])
      await denied(sql, [...args.slice(0, 5), speed]);
    await denied(sql, [args[0], "Løping", ...args.slice(2)]);
    await denied(sql, [args[0], "Fotball", "simulation", ...args.slice(3)]);
    await denied(sql, [
      ...args.slice(0, 3),
      JSON.stringify([{ latitude: 100, longitude: 10 }, route[1]]),
      ...args.slice(4),
    ]);
    const id = (await db.query(sql, args)).rows[0].id;
    check(
      (
        await db.query(
          "select author_id,route,max_speed_kmh::float8 as speed,audience from public.posts where id=$1",
          [id],
        )
      ).rows,
      [{ author_id: a, route, speed: 21.6, audience: "followers" }],
    );
    check((await db.query(sql, [...args.slice(0, 5), null])).rows[0].id, id);
    check(
      (
        await db.query("select max_speed_kmh from public.posts where id=$1", [
          id,
        ])
      ).rows[0].max_speed_kmh,
      null,
    );
    await db.query(sql, args);
    await as(b);
    check(
      (await db.query("select id from public.posts where id=$1", [id])).rows
        .length,
      0,
    );
    await db.query(
      "insert into public.follows(follower_id,following_id) values($1,$2)",
      [b, a],
    );
    check(
      (
        await db.query(
          "select max_speed_kmh::float8 as speed from public.posts where id=$1",
          [id],
        )
      ).rows[0].speed,
      21.6,
    );
    await denied(
      "update public.posts set max_speed_kmh=10 where id=$1 returning id",
      [id],
    );
    const bob = (await db.query(sql, args)).rows[0].id;
    check(bob === id, false);
    await as(a);
    const payload = {
      id: "gps-ball",
      ownerId: a,
      title: "Fotball",
      notes: "",
      sport: "Fotball",
      source: "gps",
      visibility: "private",
      date: "2026-10-27T10:00:00Z",
      distance: 3.57,
      seconds: 5277,
      route,
      maxSpeedKmh: 21.6,
    };
    const valid = async (value) =>
      (
        await db.query(
          "select public.valid_vyro_backup($1::jsonb,$2,$3) as ok",
          [JSON.stringify(value), a, payload.id],
        )
      ).rows[0].ok;
    check(await valid(payload), true);
    check(await valid({ ...payload, maxSpeedKmh: undefined }), true);
    check(await valid({ ...payload, maxSpeedKmh: null }), false);
    check(await valid({ ...payload, maxSpeedKmh: 55 }), false);
    check(await valid({ ...payload, sport: "Løping" }), false);
    check(await valid({ ...payload, turfTrace: [] }), false);
    await as(null);
    await denied("select max_speed_kmh from public.posts");
    console.log(`Football database: ${checks} checks passed.`);
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
