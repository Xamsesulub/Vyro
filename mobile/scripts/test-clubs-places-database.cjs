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
  const photo = "44444444-4444-4444-8444-444444444444";
  let checks = 0;
  const check = (actual, expected) => {
    assert.deepEqual(actual, expected);
    checks++;
  };
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
  const denied = async (sql, args = []) => {
    await assert.rejects(() => db.query(sql, args));
    checks++;
  };
  async function as(id) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  }
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      insert into auth.users(id) values('${a}'),('${b}'),('${c}');
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to authenticated;
    `);
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    for (const file of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
    check((await rows("select public from storage.buckets"))[0].public, false);
    await as(null);
    await denied("select public.create_club('Testklubb')");
    await denied("select * from public.vyro_home_feed()");
    await denied("select * from public.place_posts");
    await as(a);
    await denied("select public.create_club('X')");
    const club = (
      await rows("select public.create_club('Testklubb','Bare inviterte') id")
    )[0].id;
    check((await rows("select * from public.club_members")).length, 1);
    await denied("select public.leave_club($1)", [club]);
    await as(b);
    check((await rows("select * from public.clubs")).length, 0);
    await denied(
      "insert into public.club_members(club_id,user_id) values($1,$2)",
      [club, b],
    );
    await denied("select public.invite_to_club($1,$2)", [club, c]);
    await as(a);
    await rows("select public.invite_to_club($1,$2)", [club, b]);
    await rows("select public.invite_to_club($1,$2)", [club, b]);
    const inv = (await rows("select * from public.club_invitations"))[0].id;
    check((await rows("select * from public.club_invitations")).length, 1);
    await as(c);
    await denied("select public.respond_club_invitation($1,true)", [inv]);
    check((await rows("select * from public.clubs")).length, 0);
    await as(b);
    check((await rows("select * from public.clubs"))[0].id, club);
    check((await rows("select * from public.club_members")).length, 0);
    await rows("select public.respond_club_invitation($1,true)", [inv]);
    check((await rows("select * from public.club_members")).length, 2);
    await denied("select public.respond_club_invitation($1,true)", [inv]);
    await denied("select public.manage_club($1,null,true)", [club]);
    await rows("select public.leave_club($1)", [club]);
    check((await rows("select * from public.clubs")).length, 0);
    await as(a);
    await rows("select public.invite_to_club($1,$2)", [club, b]);
    const inv2 = (await rows("select id from public.club_invitations"))[0].id;
    await as(b);
    await rows("select public.respond_club_invitation($1,false)", [inv2]);
    check((await rows("select * from public.clubs")).length, 0);
    await as(a);
    await rows("select public.invite_to_club($1,$2)", [club, b]);
    const inv3 = (await rows("select id from public.club_invitations"))[0].id;
    await as(b);
    await rows("select public.respond_club_invitation($1,true)", [inv3]);
    await as(a);
    await rows("select public.manage_club($1,$2,false)", [club, b]);
    await as(b);
    check((await rows("select * from public.club_members")).length, 0);
    await as(a);
    await rows("select public.manage_club($1,null,true)", [club]);
    check((await rows("select * from public.clubs")).length, 0);
    check((await rows("select * from public.club_members")).length, 0);
    const photoPath = `${a}/${photo}.jpg`;
    await denied("select public.publish_place($1,'En tur')", [photo]);
    await denied(
      "insert into storage.objects(bucket_id,name) values('place-photos',$1)",
      [`${b}/${photo}.jpg`],
    );
    await denied(
      "insert into storage.objects(bucket_id,name) values('place-photos',$1)",
      [`${a}/bad.svg`],
    );
    await rows(
      "insert into storage.objects(bucket_id,name) values('place-photos',$1)",
      [photoPath],
    );
    await as(b);
    check((await rows("select * from storage.objects")).length, 0);
    await as(a);
    await denied("select public.publish_place($1,'')", [photo]);
    await denied("select public.publish_place($1,'Tur','','bad')", [photo]);
    await rows("select public.publish_place($1,'Utsikt fra turen','Oslo')", [
      photo,
    ]);
    await rows("select public.publish_place($1,'Retry','Oslo')", [photo]);
    check((await rows("select * from public.place_posts")).length, 1);
    check((await rows("select * from public.activities")).length, 0);
    check(
      (await rows("select * from public.vyro_home_feed()"))[0].post.kind,
      "place",
    );
    check(
      (await rows("select * from public.vyro_home_feed('reposted')")).length,
      0,
    );
    check((await rows("delete from storage.objects returning *")).length, 0);
    check(
      (
        await rows(
          "update storage.objects set name='replacement.jpg' returning *",
        )
      ).length,
      0,
    );
    await as(b);
    check((await rows("select * from public.place_posts")).length, 0);
    check((await rows("select * from storage.objects")).length, 0);
    await rows(
      "insert into public.follows(follower_id,following_id) values($1,$2)",
      [b, a],
    );
    check((await rows("select * from public.place_posts")).length, 1);
    check((await rows("select * from storage.objects")).length, 1);
    check((await rows("select * from public.vyro_home_feed()")).length, 1);
    check((await rows("delete from public.place_posts returning *")).length, 0);
    await rows("delete from public.follows where follower_id=$1", [b]);
    check((await rows("select * from storage.objects")).length, 0);
    check((await rows("select * from public.vyro_home_feed()")).length, 0);
    await as(c);
    check((await rows("select * from storage.objects")).length, 0);
    await as(a);
    const feed = (await rows("select * from public.vyro_home_feed()"))[0].post;
    check(
      (
        await rows(
          "select * from public.vyro_home_feed('following',20,$1,$2)",
          [feed.created_at, feed.id],
        )
      ).length,
      0,
    );
    await denied(
      "select * from public.vyro_home_feed('following',20,now(),null)",
    );
    await rows("delete from public.place_posts");
    check((await rows("delete from storage.objects returning *")).length, 1);
    check((await rows("select * from public.vyro_home_feed()")).length, 0);
    // Public-to-authenticated photos still do not become training records.
    await rows(
      "insert into storage.objects(bucket_id,name) values('place-photos',$1)",
      [photoPath],
    );
    await rows("select public.publish_place($1,'Ny tur','Oslo','everyone')", [
      photo,
    ]);
    await as(c);
    check((await rows("select * from public.place_posts")).length, 1);
    check((await rows("select * from storage.objects")).length, 1);
    check((await rows("select * from public.vyro_home_feed()")).length, 0);
    await as(a);
    // An older workout and a photo share the same keyset page without omission.
    await db.exec("reset role");
    await db.exec(`insert into public.activities(id,owner_id,local_id,title,sport,distance_km,seconds,recorded_at,source,route)
      values('${b}','${a}','fixture-workout','Lokal test','Løping',1,300,now(),'gps','[{"latitude":59.9,"longitude":10.7},{"latitude":59.91,"longitude":10.71}]');
      insert into public.posts(id,activity_id,author_id,title,sport,distance_km,seconds,recorded_at,route,audience,created_at)
      values('${b}','${b}','${a}','Lokal test','Løping',1,300,now(),'[{"latitude":59.9,"longitude":10.7},{"latitude":59.91,"longitude":10.71}]','followers',now()-interval '1 day');`);
    await as(a);
    const firstMixed = (
      await rows("select * from public.vyro_home_feed('following',1)")
    )[0].post;
    const secondMixed = (
      await rows("select * from public.vyro_home_feed('following',1,$1,$2)", [
        firstMixed.created_at,
        firstMixed.id,
      ])
    )[0].post;
    check(firstMixed.kind, "place");
    check(secondMixed.kind, "workout");
    check((await rows("select * from public.vyro_feed()")).length, 1);
    check(
      (
        await rows("select * from public.vyro_home_feed('following',1,$1,$2)", [
          secondMixed.created_at,
          secondMixed.id,
        ])
      ).length,
      0,
    );
    // Open-club discovery does not weaken invitation/member or activity privacy.
    await as(a);
    const privateClub = (
      await rows("select create_club('Fortsatt privat') id")
    )[0].id;
    const openClub = (
      await rows("select create_club('Åpen testklubb','Test','open') id")
    )[0].id;
    check(
      (await rows("select visibility from clubs where id=$1", [privateClub]))[0]
        .visibility,
      "private",
    );
    await denied("select create_club('Ugyldig','','public')");
    await denied("select create_club('Ugyldig','',null)");
    await as(null);
    await denied("select * from vyro_clubs('discover')");
    await denied("select join_open_club($1)", [openClub]);
    await denied("select * from clubs");
    await as(b);
    check(
      (await rows("select id from clubs where id=$1", [privateClub])).length,
      0,
    );
    const discovered = await rows("select * from vyro_clubs('discover')");
    check(
      discovered.map((x) => x.id),
      [openClub],
    );
    check(discovered[0].member_count, 1);
    check(
      (await rows("select * from club_members where club_id=$1", [openClub]))
        .length,
      0,
    );
    await denied("select join_open_club($1)", [privateClub]);
    await denied("select join_open_club($1)", [photo]);
    await denied("select set_club_visibility($1,'open')", [privateClub]);
    await denied("select set_club_visibility($1,'private')", [openClub]);
    await denied("update clubs set visibility='open' where id=$1", [
      privateClub,
    ]);
    await denied("select * from vyro_clubs('all')");
    await denied("select * from vyro_clubs('discover',20,now(),null)");
    await as(a);
    await rows("select invite_to_club($1,$2)", [openClub, b]);
    await as(b);
    await rows("select join_open_club($1)", [openClub]);
    await rows("select join_open_club($1)", [openClub]);
    check(
      (await rows("select * from club_members where club_id=$1", [openClub]))
        .length,
      2,
    );
    check(
      (
        await rows("select * from club_invitations where club_id=$1", [
          openClub,
        ])
      ).length,
      0,
    );
    check(
      (await rows("select id from vyro_clubs('mine')")).map((x) => x.id),
      [openClub],
    );
    check((await rows("select id from vyro_clubs('discover')")).length, 0);
    check((await rows("select * from posts")).length, 0);
    check((await rows("select * from place_posts")).length, 1); // already shared with everyone
    check((await rows("select * from vyro_home_feed()")).length, 0); // membership is not a follow
    await as(a);
    await rows("select set_club_visibility($1,'private')", [openClub]);
    await as(c);
    check((await rows("select id from vyro_clubs('discover')")).length, 0);
    await denied("select join_open_club($1)", [openClub]);
    await as(b);
    check((await rows("select id from vyro_clubs('mine')")).length, 1);
    await rows("select leave_club($1)", [openClub]);
    check(
      (await rows("select * from club_members where club_id=$1", [openClub]))
        .length,
      0,
    );
    await denied("select join_open_club($1)", [openClub]);
    await as(a);
    await rows("select set_club_visibility($1,'open')", [privateClub]);
    await rows("select set_club_visibility($1,'open')", [openClub]);
    await denied("select set_club_visibility($1,'public')", [openClub]);
    await as(c);
    const firstClub = (await rows("select * from vyro_clubs('discover',1)"))[0];
    const nextClub = (
      await rows("select * from vyro_clubs('discover',1,$1,$2)", [
        firstClub.created_at,
        firstClub.id,
      ])
    )[0];
    check(new Set([firstClub.id, nextClub.id]).size, 2);
    check(
      (
        await rows("select * from vyro_clubs('discover',1,$1,$2)", [
          nextClub.created_at,
          nextClub.id,
        ])
      ).length,
      0,
    );
    await rows("select join_open_club($1)", [privateClub]);
    await as(a);
    await rows("select manage_club($1,$2)", [privateClub, c]);
    await as(c);
    check(
      (await rows("select * from club_members where club_id=$1", [privateClub]))
        .length,
      0,
    );
    console.log(
      `Clubs/place photos: ${checks} access, invitation, privacy and feed checks passed.`,
    );
  } finally {
    await db.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
