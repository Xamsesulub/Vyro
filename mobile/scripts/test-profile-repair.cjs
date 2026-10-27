const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon;
    `);
    const migration = (name) =>
      fs.readFileSync(
        path.resolve(__dirname, "../../supabase/migrations", name),
        "utf8",
      );
    await db.exec(migration("202610200001_social.sql"));
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";
    const third = "33333333-3333-4333-8333-333333333333";
    await db.query("insert into auth.users values ($1,$2),($3,$4)", [
      first,
      {
        display_name: "  Ada  ",
        email: "private@example.invalid",
        last_name: "Private",
      },
      second,
      { display_name: "Bob" },
    ]);
    // Reproduce a missing row without touching real accounts.
    await db.query("delete from public.profiles where id=$1", [first]);
    await db.query(
      "update public.profiles set username='chosen_name', display_name='My chosen name' where id=$1",
      [second],
    );
    const repair = migration("202610270001_restore_missing_profiles.sql");
    await db.exec(repair);
    assert.equal(
      (await db.query("select count(*)::int as n from public.profiles")).rows[0]
        .n,
      2,
    );
    const repaired = (
      await db.query(
        "select id,username,display_name from public.profiles where id=$1",
        [first],
      )
    ).rows[0];
    assert.deepEqual(repaired, {
      id: first,
      username: "runner_" + first.replaceAll("-", ""),
      display_name: "Ada",
    });
    assert.deepEqual(
      (
        await db.query(
          "select username,display_name from public.profiles where id=$1",
          [second],
        )
      ).rows[0],
      { username: "chosen_name", display_name: "My chosen name" },
    );
    await db.exec(repair);
    assert.equal(
      (await db.query("select count(*)::int as n from public.profiles")).rows[0]
        .n,
      2,
    );
    await db.query("insert into auth.users values ($1,$2)", [
      third,
      { email: "private@example.invalid", last_name: "Private" },
    ]);
    assert.equal(
      (
        await db.query("select display_name from public.profiles where id=$1", [
          third,
        ])
      ).rows[0].display_name,
      "Løper",
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      first,
    ]);
    await db.exec("set role authenticated");
    assert.equal(
      (
        await db.query("select username from public.profiles where id=$1", [
          first,
        ])
      ).rows[0].username,
      repaired.username,
    );
    await assert.rejects(
      db.query(
        "insert into public.profiles(id,username,display_name) values ($1,$2,$3)",
        [first, "forged", "Forged"],
      ),
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select * from public.profiles"));
    console.log(
      "8 profile repair checks passed: backfill, public fields, preserved edits, idempotence, signup, authenticated read, insert denial, anonymous denial.",
    );
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
