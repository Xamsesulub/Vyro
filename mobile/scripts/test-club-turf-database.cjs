/* global __dirname */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
async function main() {
  const db = new PGlite();
  let checks = 0;
  const ids = Array.from(
    { length: 22 },
    (_, i) => `11111111-1111-4111-8111-${String(i + 1).padStart(12, "0")}`,
  );
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const eq = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  };
  const denied = async (sql, args = []) => {
    await assert.rejects(() => q(sql, args));
    checks++;
  };
  const as = async (id) => {
    await db.exec("reset role");
    await q("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  };
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;`);
    for (const id of ids)
      await q("insert into auth.users(id) values($1)", [id]);
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    for (const f of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
    await as(ids[0]);
    const club = (
      await q("select create_club('Klubb med 20','','open') as id")
    )[0].id;
    for (const id of ids.slice(1, 20)) {
      await as(id);
      await q("select join_open_club($1)", [club]);
    }
    await as(ids[20]);
    const other = (
      await q("select create_club('Annen klubb','','open') as id")
    )[0].id;
    await denied("select * from vyro_club_turfs($1)", [club]);
    await denied("select * from vyro_club_turf_results($1)", [club]);
    await as(ids[0]);
    await denied("select submit_turf_run('old','Old','gps','Løping','[]')");
    const trace = (seconds, offset = 0) =>
      Array.from({ length: 41 }, (_, i) => ({
        latitude: 59.92 + i * 0.0001,
        longitude: 10.73 + offset,
        accuracy: 5,
        timestamp: Date.now() - 3600000 + (i * seconds * 1000) / 40,
      }));
    const submit = async (
      clubId,
      local,
      seconds,
      turf = null,
      revision = null,
      offset = 0,
    ) =>
      (
        await q(
          "select submit_club_turf_run($1,$2,'Klubbløypa','gps','Løping',$3::jsonb,$4,$5,false) as r",
          [
            clubId,
            local,
            JSON.stringify(trace(seconds, offset)),
            turf,
            revision,
          ],
        )
      )[0].r;
    const first = await submit(club, "first", 400);
    eq(first.won, true);
    eq(
      (await q("select club_id from turfs where id=$1", [first.turf_id]))[0]
        .club_id,
      club,
    );
    // Twenty members, identical verified course, successively faster recordings.
    // PGlite serializes queries: this exercises results, not a production load benchmark.
    let revision = first.revision;
    for (let i = 1; i < 20; i++) {
      await as(ids[i]);
      const result = await submit(
        club,
        `take-${i}`,
        400 - i * 10,
        first.turf_id,
        revision,
      );
      eq(result.won, true);
      revision = result.revision;
    }
    eq(revision, 20);
    const scores = await q("select * from vyro_club_turf_results($1)", [club]);
    eq(scores.length, 20);
    eq(scores[0].user_id, ids[19]);
    eq(Number(scores[0].zones), 1);
    eq(scores.filter((s) => Number(s.zones) === 0).length, 19);
    const retry = await submit(club, "take-19", 210, first.turf_id, 1);
    eq(retry.revision, 20);
    await as(ids[0]);
    await denied(
      "select submit_club_turf_run($1,'stale','Zone','gps','Løping',$2::jsonb,$3,1,false)",
      [club, JSON.stringify(trace(200)), first.turf_id],
    );
    await denied("update turfs set owner_id=$1", [ids[0]]);
    await denied(
      "insert into turfs(name,owner_id,route,distance_m,seconds,club_id) values('Fake',$1,'[]',500,10,$2)",
      [ids[0], club],
    );
    await denied(
      "select submit_club_turf_run($1,'sim','Zone','simulation','Løping',$2::jsonb)",
      [club, JSON.stringify(trace(200))],
    );
    await denied(
      "select submit_club_turf_run($1,'football','Zone','gps','Fotball',$2::jsonb)",
      [club, JSON.stringify(trace(200))],
    );
    await as(ids[20]);
    eq((await q("select * from turfs")).length, 0);
    eq((await q("select * from turf_events")).length, 0);
    eq((await q("select * from vyro_turf_events()")).length, 0);
    await denied(
      "select submit_club_turf_run($1,'cross','Zone','gps','Løping',$2::jsonb,$3,20,false)",
      [other, JSON.stringify(trace(190)), first.turf_id],
    );
    const separate = await submit(other, "same-physical-course", 400);
    eq(separate.won, true);
    assert.notEqual(separate.turf_id, first.turf_id);
    checks++;
    await as(ids[19]);
    await q("select join_open_club($1)", [other]);
    await denied(
      "select submit_club_turf_run($1,'take-19','Zone','gps','Løping',$2::jsonb)",
      [other, JSON.stringify(trace(180))],
    );
    await q("select leave_club($1)", [club]);
    await denied("select * from vyro_club_turfs($1)", [club]);
    await denied("select * from vyro_club_turf_results($1)", [club]);
    await as(ids[0]);
    eq((await q("select * from vyro_club_turfs($1)", [club])).length, 0); // Former member's zones are inactive, not silently reassigned.
    await as(ids[19]);
    await q("select join_open_club($1)", [club]);
    await as(ids[0]);
    eq((await q("select * from vyro_club_turfs($1)", [club])).length, 1);
    await q("select vyro_block($1)", [ids[19]]);
    eq((await q("select * from vyro_club_turfs($1)", [club])).length, 0);
    eq((await q("select * from vyro_turf_events()")).length, 0);
    eq(
      (await q("select * from vyro_club_turf_results($1)", [club])).length,
      19,
    );
    await as(ids[1]);
    eq((await q("select * from vyro_club_turfs($1)", [club])).length, 1);
    await as(null);
    await denied("select * from vyro_club_turfs($1)", [club]);
    await denied("select * from vyro_club_turf_results($1)", [club]);
    await denied("select * from turfs");
    await db.exec("reset role");
    // Seed historical and many map rows only in this isolated fixture.
    await q(
      "insert into turfs(name,owner_id,route,distance_m,seconds) select 'Legacy',owner_id,route,distance_m,seconds from turfs where id=$1",
      [first.turf_id],
    );
    await q(
      "insert into turfs(name,owner_id,route,distance_m,seconds,club_id) select 'Page '||i,$1,route,distance_m,seconds,club_id from turfs cross join generate_series(1,45) i where id=$2",
      [ids[1], first.turf_id],
    );
    await as(ids[1]);
    const page = await q("select * from vyro_club_turfs($1)", [club]);
    eq(page.length, 41);
    const next = await q("select * from vyro_club_turfs($1,$2,$3)", [
      club,
      page[39].updated_at,
      page[39].id,
    ]);
    eq(new Set([...page.slice(0, 40), ...next].map((t) => t.id)).size, 46);
    eq(next.length, 6);
    eq((await q("select * from turfs where club_id is null")).length, 0);
    await as(ids[19]);
    eq((await q("select * from turfs where club_id is null")).length, 1);
    console.log(
      `${checks} club turf database checks passed (20 synthetic members, isolated PGlite).`,
    );
  } finally {
    await db.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
