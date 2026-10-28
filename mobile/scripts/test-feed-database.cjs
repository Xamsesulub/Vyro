/* global __dirname */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

async function main() {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  const c = "33333333-3333-4333-8333-333333333333";
  let checks = 0;
  function check(actual, expected) {
    assert.deepEqual(actual, expected);
    checks++;
  }
  async function denied(sql, params = []) {
    await assert.rejects(() => db.query(sql, params));
    checks++;
  }
  async function as(id) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  }
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      insert into auth.users(id) values('${a}'),('${b}'),('${c}');
    `);
    for (const file of fs
      .readdirSync(path.resolve(__dirname, "../../supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(
        fs.readFileSync(
          path.resolve(__dirname, "../../supabase/migrations", file),
          "utf8",
        ),
      );
    // Administrative fixture seeding in a disposable database. Restore rate-limit
    // triggers before exercising the API as ordinary authenticated/anonymous users.
    await db.exec(`
      begin;
      alter table public.activities disable trigger limit_activities;
      alter table public.follows disable trigger limit_follows;
      alter table public.likes disable trigger limit_likes;
      alter table public.reposts disable trigger limit_reposts;
      insert into auth.users(id) select md5('runner-'||i)::uuid from generate_series(1,1500) i;
      insert into public.follows(follower_id,following_id)
        select '${a}',md5('runner-'||i)::uuid from generate_series(1,1500) i;
      insert into public.follows(follower_id,following_id) values('${a}','${b}');
      insert into public.activities(id,owner_id,local_id,title,sport,distance_km,seconds,recorded_at,source,route)
        select md5('workout-'||i)::uuid,case when i<=120 then '${b}'::uuid else '${c}'::uuid end,
          'fixture-'||i,'Økt '||i,'Løping',1,300,now(),'gps',
          '[{"latitude":59.9,"longitude":10.7},{"latitude":59.91,"longitude":10.71}]'::jsonb
        from generate_series(1,10120) i;
      insert into public.posts(id,activity_id,author_id,title,sport,distance_km,seconds,recorded_at,route,audience,created_at)
        select id,id,owner_id,title,sport,distance_km,seconds,recorded_at,route,
          case when owner_id='${b}' then 'followers' else 'everyone' end,
          '2026-10-20T12:00:00Z'::timestamptz from public.activities;
      insert into public.likes(user_id,post_id) values
        ('${a}',md5('workout-1')::uuid),('${b}',md5('workout-1')::uuid),('${c}',md5('workout-1')::uuid);
      insert into public.reposts(user_id,post_id) values('${a}',md5('workout-1')::uuid);
      insert into public.turfs(id,name,owner_id,route,distance_m,seconds)
        values(md5('turf')::uuid,'Test','${b}','[{"latitude":59.9,"longitude":10.7},{"latitude":59.91,"longitude":10.71}]',1000,300);
      insert into public.turf_events(turf_id,actor_id,revision,extended,distance_m,seconds,created_at)
        select md5('turf')::uuid,case when i<=5 then '${b}'::uuid else '${c}'::uuid end,
          1,false,1000,300,now() from generate_series(1,1000) i;
      alter table public.activities enable trigger limit_activities;
      alter table public.follows enable trigger limit_follows;
      alter table public.likes enable trigger limit_likes;
      alter table public.reposts enable trigger limit_reposts;
      commit;
      analyze;
    `);
    await as(null);
    await denied("select * from public.vyro_feed()");
    await denied("select * from public.vyro_turf_events()");
    await db.exec("set role authenticated");
    await denied("select * from public.vyro_feed()");
    await as(a);
    const begin = performance.now();
    const first = (
      await db.query("select * from public.vyro_feed('following',20)")
    ).rows;
    const firstMs = Math.round(performance.now() - begin);
    check(first.length, 20);
    check(
      first.every((row) => row.author_id === b),
      true,
    );
    check(
      first.every(
        (row) =>
          !Object.hasOwn(row, "route") && !Object.hasOwn(row, "activity_id"),
      ),
      true,
    );
    check(
      (await db.query("select * from public.vyro_feed('following',99999)")).rows
        .length,
      31,
    );
    check(
      (await db.query("select * from public.vyro_feed('following',0)")).rows
        .length,
      1,
    );
    await denied("select * from public.vyro_feed('invalid')");
    await denied("select * from public.vyro_feed('following',20,now(),null)");
    await denied("select * from public.vyro_feed('following',20,null,$1)", [a]);
    const seen = new Set(first.map((row) => row.id));
    let cursor = first.at(-1);
    for (;;) {
      const rows = (
        await db.query("select * from public.vyro_feed('following',20,$1,$2)", [
          cursor.created_at,
          cursor.id,
        ])
      ).rows;
      if (!rows.length) break;
      for (const row of rows) {
        check(seen.has(row.id), false);
        seen.add(row.id);
      }
      cursor = rows.at(-1);
    }
    check(seen.size, 120); // More than 1,000 follows; no missing/tied-timestamp duplicate posts.
    const reposts = (
      await db.query("select * from public.vyro_feed('reposted')")
    ).rows;
    check(reposts.length, 1);
    check(Number(reposts[0].like_count), 3);
    check(reposts[0].liked, true);
    check(reposts[0].reposted, true);
    check(
      (await db.query("select * from public.vyro_turf_events()")).rows.length,
      3,
    );
    check((await db.query("select * from public.activities")).rows.length, 0);
    await db.query(
      "delete from public.follows where follower_id=$1 and following_id=$2",
      [a, b],
    );
    check((await db.query("select * from public.vyro_feed()")).rows.length, 0);
    check(
      (await db.query("select * from public.vyro_feed('reposted')")).rows
        .length,
      0,
    );
    check(
      (await db.query("select * from public.vyro_turf_events()")).rows.length,
      0,
    );
    check((await db.query("select * from public.likes")).rows.length, 0);
    check(
      (
        await db.query("select route from public.posts where id=$1", [
          reposts[0].id,
        ])
      ).rows.length,
      0,
    );
    await as(b);
    check((await db.query("select * from public.vyro_feed()")).rows.length, 20);
    await db.exec("reset role");
    check(
      (
        await db.query(
          "select bool_and(not prosecdef) as safe from pg_proc where proname in ('vyro_feed','vyro_turf_events')",
        )
      ).rows[0].safe,
      true,
    );
    check(
      (
        await db.query(
          "select count(*)::int as n from pg_indexes where indexname in ('posts_created_id_idx','posts_author_created_id_idx','turf_events_actor_created_idx','turfs_updated_idx')",
        )
      ).rows[0].n,
      4,
    );
    console.log(
      `${checks} feed/privacy/pagination checks passed with 10,120 posts, 1,501 follows and 1,000 turf events. First page: ${firstMs} ms in local PGlite (not a production concurrency benchmark).`,
    );
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
