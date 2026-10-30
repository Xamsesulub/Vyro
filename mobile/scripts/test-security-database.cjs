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
    key = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const eq = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  };
  const denied = async (sql, args = []) => {
    await assert.rejects(() => q(sql, args), undefined, sql);
    checks++;
  };
  const as = async (id) => {
    await db.exec("reset role");
    await q("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
    await q("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: id, session_id: session }),
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  };
  const admin = async () => {
    await as(null);
    await db.exec("reset role");
  };
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade,created_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated,anon,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
 alter table storage.objects enable row level security;grant usage on schema storage to authenticated;
 grant select,insert,update,delete on storage.objects to authenticated;
 insert into auth.users(id) values('${A}'),('${B}'),('${C}');insert into auth.sessions(id,user_id) values('${session}','${C}');`);
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    for (const file of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
    await db.exec(`insert into auth.sessions(id,user_id) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','${A}');
 insert into public.push_devices(installation,owner_id,session_id,token) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','${A}','dddddddd-dddd-4ddd-8ddd-dddddddddddd','ExpoPushToken[synthetic-security-test]');`);
    await as(A);
    const post = (
      await q(
        "select publish_workout('safety','Test','Yoga',0,600,now(),'timer','[]','everyone') id",
      )
    )[0].id;
    const club = (await q("select create_club('Test club','') id"))[0].id;
    await q("select invite_to_club($1,$2)", [club, B]);
    const route = (
      await q(
        "select contribute_route('route','Test route','Oslo','Løping',$1,'gps',true) id",
        [
          JSON.stringify(
            Array.from({ length: 101 }, (_, i) => ({
              latitude: 59.9 + i * 0.00025,
              longitude: 10.7,
            })),
          ),
        ],
      )
    )[0].id;
    await as(B);
    await q("select vyro_follow($1)", [A]);
    await admin();
    eq((await q("select * from push_jobs")).length, 1);
    await as(B);
    eq((await q("select id from posts where id=$1", [post])).length, 1);
    eq(
      (await q("select * from search_community_routes(59.91,10.7,'Løping')"))
        .length,
      1,
    );
    await q("select save_route_suggestion($1)", [route]);
    const receipt = (
      await q("select vyro_report($1,'spam','test',$2) id", [A, post])
    )[0].id;
    eq(
      (await q("select vyro_report($1,'spam','same',$2) id", [A, post]))[0].id,
      receipt,
    );
    await denied("select vyro_report($1,'spam','spoof',$2)", [C, post]);
    await denied("select * from safety_reports");
    await denied("insert into user_blocks values($1,$2,now())", [A, B]);
    await q("select vyro_block($1)", [A]);
    eq((await q("select * from vyro_my_blocks()")).length, 1);
    eq((await q("select * from follows")).length, 0);
    eq((await q("select id from posts where id=$1", [post])).length, 0);
    eq((await q("select id from profiles where id=$1", [A])).length, 0);
    eq(
      (await q("select * from search_community_routes(59.91,10.7,'Løping')"))
        .length,
      0,
    );
    await denied("select save_route_suggestion($1)", [route]);
    await denied("select vyro_follow($1)", [A]);
    await denied("insert into likes(post_id,user_id) values($1,$2)", [post, B]);
    await denied(
      "insert into comments(post_id,author_id,body) values($1,$2,'no')",
      [post, B],
    );
    await as(A);
    eq((await q("select id from profiles where id=$1", [B])).length, 0);
    eq((await q("select * from social_notifications")).length, 0);
    eq((await q("select * from club_invitations")).length, 0);
    await denied("select invite_to_club($1,$2)", [club, B]);
    await q("select vyro_block($1,false)", [B]); // cannot undo the other person's block
    eq((await q("select id from profiles where id=$1", [B])).length, 0);
    await admin();
    eq((await q("select * from push_jobs")).length, 0);
    await as(B);
    await q("select vyro_block($1,false)", [A]);
    eq((await q("select id from profiles where id=$1", [A])).length, 1);
    eq((await q("select * from follows")).length, 0);

    // Opt-in closes plaintext uploads and makes ciphertext immutable and owner-only.
    const payload = {
      id: "legacy",
      ownerId: B,
      title: "Private",
      notes: "Private note",
      sport: "Yoga",
      distance: 0,
      seconds: 60,
      date: new Date().toISOString(),
      source: "timer",
      visibility: "private",
      route: [],
    };
    await q(
      "insert into workout_backups(owner_id,local_id,payload) values($1,$2,$3)",
      [B, "legacy", payload],
    );
    await q(
      "insert into backup_vaults(owner_id,key_id,verifier) values($1,$2,$3)",
      [B, key, "A".repeat(48)],
    );
    await denied(
      "insert into workout_backups(owner_id,local_id,payload) values($1,$2,$3)",
      [B, "new", { ...payload, id: "new" }],
    );
    await q(
      "insert into encrypted_workout_backups(owner_id,key_id,local_id,ciphertext) values($1,$2,'encrypted',$3)",
      [B, key, "B".repeat(80)],
    );
    await denied("update backup_vaults set verifier=repeat('C',48)");
    await denied(
      "update encrypted_workout_backups set ciphertext=repeat('C',80)",
    );
    await denied("delete from backup_vaults");
    await as(A);
    eq((await q("select * from backup_vaults")).length, 0);
    eq((await q("select * from encrypted_workout_backups")).length, 0);
    await denied(
      "insert into encrypted_workout_backups(owner_id,key_id,local_id,ciphertext) values($1,$2,'spoof',$3)",
      [B, key, "B".repeat(80)],
    );
    await as(null);
    await denied("select * from encrypted_workout_backups");

    // Recent login uses auth.sessions, never a user-supplied timestamp or refreshed iat.
    await as(C);
    await denied("select vyro_begin_account_deletion($1,$2)", [C, session]);
    await admin();
    await q("update auth.sessions set created_at=now()-interval '1 hour'");
    await db.exec("set role service_role");
    await denied("select vyro_begin_account_deletion($1,$2)", [C, session]);
    await admin();
    await q("update auth.sessions set created_at=now()");
    await db.exec("set role service_role");
    await denied("select vyro_begin_account_deletion($1,$2)", [B, session]);
    await q("select vyro_begin_account_deletion($1,$2)", [C, session]);
    await as(C);
    await denied(
      "update profiles set display_name='Blocked write' where id=$1",
      [C],
    );
    await denied("select create_club('No more writes','')");
    await denied(
      "insert into storage.objects(bucket_id,name) values('profile-photos',$1)",
      [`${C}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`],
    );
    await admin();
    await q("delete from auth.users where id=$1", [C]);
    eq((await q("select * from account_deletions")).length, 0);
    eq((await q("select id from profiles where id=$1", [C])).length, 0);
    eq((await q("select id from profiles where id=$1", [A])).length, 1);
    console.log(
      `${checks} security database isolation, blocking, reporting, encryption and deletion checks passed.`,
    );
  } finally {
    await db.close();
  }
}
async function freshBackup() {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,public to authenticated,anon;
   create function public.limit_vyro_write() returns trigger language plpgsql as $$begin return new;end$$;
   insert into auth.users values('11111111-1111-4111-8111-111111111111');`);
    await db.exec(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../../supabase/migrations/202610280005_encrypted_backups.sql",
        ),
        "utf8",
      ),
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);set role authenticated;`,
    );
    assert.equal(
      (await db.query("select * from workout_backups")).rows.length,
      0,
    );
    await assert.rejects(() =>
      db.query(
        "insert into workout_backups(owner_id,local_id,payload) values(auth.uid(),'old','{}')",
      ),
    );
    await db.exec(
      "insert into backup_vaults(owner_id,key_id,verifier) values(auth.uid(),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',repeat('A',48));",
    );
    await db.exec(
      "insert into encrypted_workout_backups(owner_id,key_id,local_id,ciphertext) values(auth.uid(),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','new',repeat('B',80));",
    );
    assert.equal(
      (await db.query("select * from encrypted_workout_backups")).rows.length,
      1,
    );
    console.log(
      "3 fresh-deployment encrypted-backup checks passed; plaintext uploads stay disabled.",
    );
  } finally {
    await db.close();
  }
}
main()
  .then(freshBackup)
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
