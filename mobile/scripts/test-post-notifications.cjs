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
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const eq = (actual, expected) => {
    assert.deepEqual(actual, expected);
    checks++;
  };
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
  // Separate scenarios model different minutes; retain the real write-limit trigger.
  const clearJobs = () =>
    db.exec(
      "reset role;truncate public.push_jobs;update write_limits set bucket=now()-interval '2 minutes' where action='activities'",
    );
  const jobs = async () => {
    await db.exec("reset role;set role service_role");
    return q("select * from vyro_claim_push()");
  };
  const notices = async (kind) =>
    await q("select * from social_notifications where kind=$1", [kind]);
  const pref = async (owner, category, inApp, push) =>
    q(
      `insert into notification_preferences values($1,$2,$3,$4)
    on conflict(owner_id,category) do update set owner_id=excluded.owner_id,category=excluded.category,in_app=excluded.in_app,push=excluded.push`,
      [owner, category, inApp, push],
    );
  let seq = 0;
  const publish = async (local = `test-${++seq}`) =>
    (
      await q(
        "select publish_workout($1,'Lokal test','Yoga',0,600,now(),'timer','[]','followers') id",
        [local],
      )
    )[0].id;
  const like = (id) =>
    q("insert into likes(user_id,post_id) values($1,$2)", [B, id]);
  const comment = async (id) =>
    (
      await q(
        "insert into comments(author_id,post_id,body) values($1,$2,'Lokal testkommentar') returning id",
        [B, id],
      )
    )[0].id;
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon,service_role;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
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
    await q(
      "select vyro_register_push($1,'ExpoPushToken[local_post_notification_test]')",
      [device],
    );
    await pref(A, "posts", true, false);
    eq((await q("select * from notification_preferences")).length, 1);
    await as(B);
    eq((await q("select * from notification_preferences")).length, 0);
    await denied(
      "insert into notification_preferences values($1,'likes',false,false)",
      [A],
    );
    await denied("select vyro_notice_preference($1,'like',true)", [A]);
    await denied("select vyro_notice_source_available($1)", [A]);
    await q("select vyro_follow($1)", [A]);
    await clearJobs();
    await as(A);
    const p = await publish("original");
    // The author never receives notifications for their own actions.
    await q("insert into likes(user_id,post_id) values($1,$2)", [A, p]);
    await q(
      "insert into comments(author_id,post_id,body) values($1,$2,'Egen kommentar')",
      [A, p],
    );
    eq((await notices("like")).length, 0);
    eq((await notices("comment")).length, 0);
    await as(B);
    eq((await notices("post")).length, 1);
    await like(p);
    await as(A);
    let n = (await notices("like"))[0];
    eq(n.actor_id, B);
    eq(n.post_id, p);
    let work = await jobs();
    eq(work.length, 1);
    eq(work[0].kind, "like");
    eq(work[0].notice_id, n.id);
    eq((await jobs()).length, 0); // leased once
    await clearJobs();
    await as(B);
    await q("delete from likes where post_id=$1 and user_id=$2", [p, B]);
    await as(A);
    eq((await notices("like")).length, 0);
    await as(B);
    await like(p);
    await as(A);
    eq((await notices("like")).length, 1);
    eq((await jobs()).length, 0); // cooldown
    await as(B);
    const cid = await comment(p);
    await as(A);
    n = (await notices("comment"))[0];
    eq(n.comment_id, cid);
    work = await jobs();
    eq(work.length, 1);
    eq(work[0].kind, "comment");
    await clearJobs();
    await as(B);
    await comment(p);
    eq((await jobs()).length, 0); // grouped within five minutes
    await as(C);
    eq(
      (await q("select vyro_notification_target($1) target", [n.id]))[0].target,
      null,
    );
    eq(
      (await q("select vyro_notice_visible($1) visible", [n.id]))[0].visible,
      false,
    );
    await denied(
      "insert into comments(author_id,post_id,body) values($1,$2,'Ingen tilgang')",
      [C, p],
    );
    await as(A);
    let target = (
      await q("select vyro_notification_target($1) target", [n.id])
    )[0].target;
    eq(target.postId, p);
    eq(target.comments, true);
    eq(target.type, "workout");
    eq((await notices("comment"))[0].read_at !== null, true);
    await as(B);
    await q("delete from comments where id=$1", [cid]);
    await as(A);
    eq(
      (await q("select vyro_notification_target($1) target", [n.id]))[0].target,
      null,
    );
    // Independent channels: inbox-only, push-only, neither, and pending opt-out.
    await pref(A, "comments", true, false);
    const p2 = await publish();
    await as(B);
    await comment(p2);
    await as(A);
    eq((await notices("comment")).length, 1);
    eq((await jobs()).length, 0);
    await as(A);
    await pref(A, "likes", false, true);
    await as(B);
    await like(p2);
    await as(A);
    eq((await notices("like")).length, 1); // old inbox entry only
    work = await jobs();
    eq(work.length, 1);
    eq(work[0].kind, "like");
    n = work[0];
    await as(A);
    target = (
      await q("select vyro_notification_target($1) target", [n.notice_id])
    )[0].target;
    eq(target.postId, p2);
    eq(target.comments, false);
    await pref(A, "comments", false, false);
    const p3 = await publish();
    await clearJobs();
    await as(B);
    await comment(p3);
    await as(A);
    eq((await notices("comment")).filter((n) => n.post_id === p3).length, 0);
    eq((await jobs()).length, 0);
    await as(B);
    await like(p3);
    await as(A);
    await pref(A, "likes", true, false);
    eq((await jobs()).length, 0);
    // Turning on later never sends old notifications retroactively.
    await as(A);
    await pref(A, "likes", true, true);
    eq((await jobs()).length, 0);
    await as(A);
    const p4 = await publish();
    await clearJobs();
    await as(B);
    await like(p4);
    await q("delete from likes where post_id=$1 and user_id=$2", [p4, B]);
    eq((await jobs()).length, 0);
    // New posts: only accepted followers, no update/republication duplicates.
    await as(A);
    await q("select vyro_follow($1)", [B]);
    await clearJobs();
    await as(B);
    const bp = await publish("b-original");
    await as(A);
    eq((await notices("post")).length, 1);
    eq((await jobs()).length, 0); // push default off
    await as(A);
    await pref(A, "posts", true, true);
    await as(B);
    await publish("b-original");
    await as(A);
    eq((await notices("post")).length, 1);
    eq((await jobs()).length, 0);
    await as(B);
    const bp2 = await publish();
    await as(A);
    eq((await notices("post")).length, 2);
    work = await jobs();
    eq(work.length, 1);
    eq(work[0].kind, "post");
    await clearJobs();
    await as(B);
    const bp3 = await publish();
    await as(A);
    await q("select vyro_follow($1,false)", [B]);
    eq((await notices("post")).length, 0);
    eq((await jobs()).length, 0);
    await as(B);
    await q("update profiles set is_private=true where id=$1", [B]);
    await as(A);
    await q("select vyro_follow($1)", [B]);
    await as(B);
    await publish();
    await as(A);
    eq((await notices("post")).length, 0);
    await as(B);
    await q("select vyro_respond_follow($1,true)", [A]);
    await clearJobs();
    await as(B);
    const bp4 = await publish();
    await as(A);
    eq(
      (await notices("post")).some((n) => n.post_id === bp4),
      true,
    );
    await as(B);
    await q("delete from follows where follower_id=$1 and following_id=$2", [
      A,
      B,
    ]);
    eq((await jobs()).length, 0);
    await as(A);
    eq((await notices("post")).length, 0);
    // Deleted posts cascade notices/jobs. Place publications follow the same rules.
    await as(A);
    await q("update profiles set is_private=true where id=$1", [A]);
    const p5 = await publish();
    await as(B);
    await like(p5);
    await as(A);
    await q("delete from posts where id=$1", [p5]);
    eq(
      (await notices("like")).some((n) => n.post_id === p5),
      false,
    );
    eq((await jobs()).length, 0);
    await as(B);
    await q("update profiles set is_private=false where id=$1", [B]);
    await as(A);
    await q("select vyro_follow($1)", [B]);
    await clearJobs();
    await as(B);
    const place = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await q(
      "insert into storage.objects(bucket_id,name) values('place-photos',$1)",
      [`${B}/${place}.jpg`],
    );
    await q("select publish_place($1,'Lokal test','Oslo','followers')", [
      place,
    ]);
    await as(A);
    n = (await notices("post")).find((n) => n.place_post_id === place);
    eq(!!n, true);
    work = await jobs();
    eq(work.length, 1);
    eq(work[0].kind, "post");
    await as(A);
    target = (await q("select vyro_notification_target($1) target", [n.id]))[0]
      .target;
    eq(target.type, "place");
    eq(target.postId, place);
    await as(B);
    await q("delete from place_posts where id=$1", [place]);
    await as(A);
    eq(
      (await q("select vyro_notification_target($1) target", [n.id]))[0].target,
      null,
    );
    await as(C);
    eq((await q("select * from social_notifications")).length, 0);
    await denied("select * from push_jobs");
    await denied("select * from push_devices");
    await as(null);
    await denied("select * from notification_preferences");
    await denied("select vyro_notification_target($1)", [n.id]);
    // No migration backfill: the unused references simply assert fixtures existed.
    eq(new Set([bp, bp2, bp3, bp4]).size, 4);
    console.log(
      `${checks} post notification privacy, preference, delivery and target checks passed.`,
    );
  } finally {
    await db.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
