const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
async function main() {
  const db = new PGlite();
  const alice = "11111111-1111-4111-8111-111111111111";
  const bob = "22222222-2222-4222-8222-222222222222";
  let assertions = 0;
  function check(actual, expected) {
    assert.deepEqual(actual, expected);
    assertions++;
  }
  async function denied(sql, params = []) {
    await assert.rejects(() => db.query(sql, params));
    assertions++;
  }
  async function as(id) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  }
  await db.exec(`
    create role anon;
    create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth, public to anon,authenticated;
    insert into auth.users values ('${alice}','{"display_name":"Alice test"}'),('${bob}','{"display_name":"Bob test"}');
  `);
  await db.exec(
    fs.readFileSync(
      path.resolve(
        __dirname,
        "../../supabase/migrations/202610200001_social.sql",
      ),
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync(
      path.resolve(
        __dirname,
        "../../supabase/migrations/202610200002_security.sql",
      ),
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync(
      path.resolve(
        __dirname,
        "../../supabase/migrations/202610200003_sharing_privacy.sql",
      ),
      "utf8",
    ),
  );
  const route = JSON.stringify([
    { latitude: 59.9, longitude: 10.7 },
    { latitude: 59.91, longitude: 10.71 },
  ]);
  const publish =
    "select public.publish_workout($1,'Testøkt','Løping',1,300,now(),$2,$3::jsonb) as id";
  await as(null);
  await denied("select * from public.profiles");
  await denied(publish, ["one", "gps", route]);
  await as(alice);
  check((await db.query("select * from profiles")).rows.length, 2);
  await denied(publish, ["sim", "simulation", route]);
  await denied(publish, [
    "bad",
    "gps",
    '[{"latitude":99,"longitude":10},{"latitude":60,"longitude":10}]',
  ]);
  await denied(publish, ["missing", "gps", "[{},{}]"]);
  const post = (await db.query(publish, ["one", "gps", route])).rows[0].id;
  check((await db.query(publish, ["one", "gps", route])).rows[0].id, post);
  check((await db.query("select * from activities")).rows.length, 1);
  await denied("insert into follows(follower_id,following_id) values($1,$2)", [
    bob,
    alice,
  ]);
  await denied("insert into follows(follower_id,following_id) values($1,$1)", [
    alice,
  ]);
  await db.query("insert into follows values($1,$2,now())", [alice, bob]);
  await denied("insert into follows values($1,$2,now())", [alice, bob]);
  await denied("insert into posts(author_id,title) values($1,'Forged')", [bob]);
  await db.query("update profiles set display_name='Stolen' where id=$1", [
    bob,
  ]);
  check(
    (await db.query("select display_name from profiles where id=$1", [bob]))
      .rows[0].display_name,
    "Bob test",
  );
  await as(bob);
  check((await db.query("select * from activities")).rows.length, 0);
  check((await db.query("select * from posts")).rows.length, 0);
  await denied("insert into likes values($1,$2)", [bob, post]);
  await denied(
    "insert into comments(author_id,post_id,body) values($1,$2,'hidden')",
    [bob, post],
  );
  await db.query(
    "insert into follows(follower_id,following_id) values($1,$2)",
    [bob, alice],
  );
  check((await db.query("select * from posts")).rows.length, 1);
  await db.query("delete from posts where id=$1", [post]);
  check((await db.query("select * from posts")).rows.length, 1);
  await denied("insert into likes values($1,$2)", [alice, post]);
  await db.query("insert into likes values($1,$2)", [bob, post]);
  await db.query("insert into reposts(user_id,post_id) values($1,$2)", [
    bob,
    post,
  ]);
  await db.query(
    "insert into comments(author_id,post_id,body) values($1,$2,'Bra!')",
    [bob, post],
  );
  await denied(
    "insert into comments(author_id,post_id,body) values($1,$2,' ')",
    [bob, post],
  );
  await as(alice);
  await db.exec("delete from comments");
  check((await db.query("select * from comments")).rows.length, 1);
  await db.query("delete from posts where id=$1", [post]);
  check((await db.query("select * from likes")).rows.length, 0);
  check((await db.query("select * from comments")).rows.length, 0);
  check((await db.query("select * from reposts")).rows.length, 0);
  check((await db.query("select * from activities")).rows.length, 1);
  await db.exec("delete from activities");
  check((await db.query("select * from activities")).rows.length, 0);
  await denied("select * from write_limits");
  await denied(publish, [
    "extra",
    "gps",
    '[{"latitude":59,"longitude":10,"notes":"private"},{"latitude":60,"longitude":11}]',
  ]);
  await denied(publish, [
    "break",
    "gps",
    '[{"latitude":59,"longitude":10,"breakBefore":"false"},{"latitude":60,"longitude":11}]',
  ]);
  const newPost = (await db.query(publish, ["two", "gps", route])).rows[0].id;
  // Deleting a comment must not reset the server rate limit.
  for (let i = 0; i < 20; i++) {
    await db.query(
      "insert into comments(author_id,post_id,body,created_at) values($1,$2,'test','2099-01-01')",
      [alice, newPost],
    );
    await db.exec("delete from comments");
  }
  await denied(
    "insert into comments(author_id,post_id,body) values($1,$2,'limited')",
    [alice, newPost],
  );
  await as(bob);
  await db.query(
    "insert into comments(author_id,post_id,body,created_at) values($1,$2,'independent','2099-01-01')",
    [bob, newPost],
  );
  check(
    (
      await db.query(
        "select count(*)::int as n from comments where created_at > now()+interval '1 minute'",
      )
    ).rows[0].n,
    0,
  );
  await denied("delete from write_limits");
  await db.query(
    "delete from follows where follower_id=$1 and following_id=$2",
    [bob, alice],
  );
  check((await db.query("select * from posts")).rows.length, 0);
  check((await db.query("select * from comments")).rows.length, 0);
  await as(alice);
  const changedRoute = JSON.stringify([
    { latitude: 60, longitude: 11 },
    { latitude: 60.01, longitude: 11.01 },
  ]);
  check(
    (await db.query(publish, ["two", "gps", changedRoute])).rows[0].id,
    newPost,
  );
  check(
    (await db.query("select route from posts where id=$1", [newPost])).rows[0]
      .route,
    JSON.parse(changedRoute),
  );
  await db.query(
    "select publish_workout('two','Testøkt','Løping',1,300,now(),'gps',$1::jsonb,'everyone')",
    [changedRoute],
  );
  await as(bob);
  check((await db.query("select * from posts")).rows.length, 1);
  await db.close();
  console.log(
    `${assertions} PostgreSQL permission, validation and cascade assertions passed (local PGlite; no production writes).`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
