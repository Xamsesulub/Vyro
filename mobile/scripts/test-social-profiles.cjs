/* global __dirname */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
async function main() {
  const db = new PGlite();
  let checks = 0;
  const A = "11111111-1111-4111-8111-111111111111",
    B = "22222222-2222-4222-8222-222222222222",
    C = "33333333-3333-4333-8333-333333333333";
  const session = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    device = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const equal = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  };
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const denied = async (sql, args = []) => {
    await assert.rejects(() => q(sql, args));
    checks++;
  };
  const as = async (id) => {
    await db.exec("reset role");
    await q("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
    await q("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: id, session_id: session }),
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  };
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated,anon,service_role;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
 alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
 insert into auth.users(id) values('${A}'),('${B}'),('${C}');insert into auth.sessions values('${session}','${A}');`);
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    for (const f of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
    await as(A);
    await q("select vyro_register_push($1,$2)", [
      device,
      "ExpoPushToken[valid_fake_local_test_token]",
    ]);
    equal(
      (await q("select vyro_push_enabled($1) enabled", [device]))[0].enabled,
      true,
    );
    const post = (
      await q(
        "select publish_workout('private-test','Test','Yoga',0,600,now(),'timer','[]','everyone') id",
      )
    )[0].id;
    await as(B);
    equal((await q("select id from posts where id=$1", [post])).length, 1);
    await as(A);
    await q("update profiles set is_private=true where id=$1", [A]);
    await as(B);
    equal((await q("select id from posts where id=$1", [post])).length, 0);
    await denied(
      "insert into follows(follower_id,following_id) values($1,$2)",
      [B, A],
    );
    equal((await q("select vyro_follow($1) state", [A]))[0].state, "requested");
    await q("select vyro_follow($1)", [A]);
    await denied(
      "insert into social_notifications(recipient_id,actor_id,kind) values($1,$2,'follow')",
      [B, A],
    );
    await denied("select * from push_devices");
    await denied("select * from push_jobs");
    await denied("select * from vyro_claim_push()");
    await as(C);
    equal((await q("select * from follow_requests")).length, 0);
    await q("select vyro_respond_follow($1,true)", [B]);
    await as(B);
    equal(
      (await q("select * from follows where following_id=$1", [A])).length,
      0,
    );
    await as(A);
    equal((await q("select * from follow_requests")).length, 1);
    equal((await q("select * from social_notifications")).length, 1);
    await denied("update social_notifications set kind='accepted'");
    await db.exec("reset role;set role service_role");
    let jobs = await q("select * from vyro_claim_push()");
    equal(jobs.length, 1);
    equal(jobs[0].kind, "request");
    equal((await q("select * from vyro_claim_push()")).length, 0);
    await q("select vyro_finish_push($1,$2,'ticket','test-ticket')", [
      jobs[0].id,
      jobs[0].lease,
    ]);
    equal((await q("select status from push_jobs"))[0].status, "receipt");
    await as(A);
    await q("select vyro_respond_follow($1,true)", [B]);
    await as(B);
    equal((await q("select id from posts where id=$1", [post])).length, 1);
    equal((await q("select * from vyro_feed('following')")).length, 1);
    equal(
      (await q("select * from social_notifications where kind='accepted'"))
        .length,
      1,
    );
    await as(A);
    await q("delete from follows where follower_id=$1 and following_id=$2", [
      B,
      A,
    ]);
    await as(B);
    equal((await q("select id from posts where id=$1", [post])).length, 0);
    await q("select vyro_follow($1)", [A]);
    await q("select vyro_follow($1,false)", [A]);
    equal((await q("select * from follow_requests")).length, 0);
    await q("select vyro_follow($1)", [A]);
    await as(A);
    await q("select vyro_respond_follow($1,false)", [B]);
    equal((await q("select * from follow_requests")).length, 0);
    const pic = `${A}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`;
    await denied("select vyro_set_avatar($1)", [pic]);
    await q(
      "insert into storage.objects(bucket_id,name) values('profile-photos',$1)",
      [pic],
    );
    await as(B);
    equal(
      (await q("select * from storage.objects where name=$1", [pic])).length,
      0,
    );
    await denied("select vyro_set_avatar($1)", [pic]);
    await as(A);
    await q("select vyro_set_avatar($1)", [pic]);
    await as(B);
    equal(
      (await q("select * from storage.objects where name=$1", [pic])).length,
      1,
    );
    await as(A);
    equal(
      (
        await q("delete from storage.objects where name=$1 returning name", [
          pic,
        ])
      ).length,
      0,
    );
    await denied("update profiles set avatar_path=$1 where id=$2", [pic, A]);
    await q("select vyro_set_avatar(null)");
    await q("delete from storage.objects where name=$1", [pic]);
    await q("select vyro_disable_push($1)", [device]);
    equal(
      (await q("select vyro_push_enabled($1) enabled", [device]))[0].enabled,
      false,
    );
    await db.exec("reset role;set role service_role");
    equal((await q("select * from vyro_claim_push()")).length, 0);
    await as(A);
    await q(
      "select vyro_register_push($1,'ExpoPushToken[valid_fake_local_test_token]')",
      [device],
    );
    await db.exec("reset role");
    await q("delete from auth.sessions where id=$1", [session]);
    await as(A);
    await denied(
      "select vyro_register_push($1,'ExpoPushToken[valid_fake_local_test_token]')",
      [device],
    );
    await as(null);
    await denied("select * from social_notifications");
    await denied("select vyro_follow($1)", [A]);
    console.log(
      `${checks} social privacy, request, avatar and push queue checks passed.`,
    );
  } finally {
    await db.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
