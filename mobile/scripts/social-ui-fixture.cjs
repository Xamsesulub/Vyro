/* global __dirname */
// Disposable UI test server. ALL Supabase traffic goes to in-memory PostgreSQL.
// Bound only to loopback; no real accounts, location records or uploads.
const { Buffer } = require("node:buffer");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
async function main() {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222",
    c = "33333333-3333-4333-8333-333333333333";
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users,created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated;
 insert into auth.users values('${a}','{"display_name":"Alex (test)"}'),('${b}','{"display_name":"Mina (test)"}'),('${c}','{"display_name":"Noah (test)"}');
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
 alter table storage.objects enable row level security; grant usage on schema storage to authenticated;
 grant select,insert,update,delete on storage.objects to authenticated;`);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const f of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  const as = async (id) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  };
  await as(b);
  const club = (
    await db.query(
      "select create_club('Søndagsturer','Rolige turer og gode pauser. Lokal testklubb.') id",
    )
  ).rows[0].id;
  await db.query("select invite_to_club($1,$2)", [club, a]);
  await db.query(
    "select create_club('Turvenner i Oslo','Rolige turer langs Akerselva. Lokal testklubb.','open')",
  );
  await as(a);
  await db.query(
    "select create_club('Ut etter jobb','Lokal testklubb for hverdagsturer.')",
  );
  await db.query(
    "insert into follows(follower_id,following_id) values($1,$2)",
    [a, b],
  );
  await db.query("update profiles set is_private=true where id=$1", [a]);
  await as(b);
  await db.query("select vyro_follow($1)", [a]);
  if (
    ["post-notifications", "feed-comments"].includes(
      process.env.VYRO_UI_SCENARIO,
    )
  ) {
    await as(a);
    await db.query("select vyro_respond_follow($1,true)", [b]);
    const own = (
      await db.query(
        "select publish_workout('notice-own','Yoga etter jobb','Yoga',0,900,now(),'timer','[]','followers') id",
      )
    ).rows[0].id;
    await as(b);
    await db.query("insert into likes(user_id,post_id) values($1,$2)", [
      b,
      own,
    ]);
    await db.query(
      "insert into comments(author_id,post_id,body) values($1,$2,'Fin økt! Dette er bare en lokal test.')",
      [b, own],
    );
    await db.query(
      "select publish_workout('notice-other','En rolig yogaøkt','Yoga',0,1200,now(),'timer','[]','followers')",
    );
    if (process.env.VYRO_UI_SCENARIO === "feed-comments") {
      // Synthetic already-shielded route, only in disposable PostgreSQL.
      await db.query(
        "update posts set title='Tur i parken · lokal test',sport='Løping',distance_km=0.65,seconds=439,route=$1::jsonb where author_id=$2",
        [
          JSON.stringify([
            { latitude: 59.924, longitude: 10.722 },
            { latitude: 59.925, longitude: 10.7225 },
            { latitude: 59.926, longitude: 10.723 },
          ]),
          b,
        ],
      );
      await db.query(
        "update profiles set username='runner_e85ffea8a1e7416c834b2c79e9d65617' where id=$1",
        [b],
      );
      await db.query(
        "insert into comments(author_id,post_id,body) select $1,id,'Fint sted for en tur! Lokal test.' from posts where author_id=$1",
        [b],
      );
    }
  }
  if (process.env.VYRO_UI_SCENARIO === "club-zones") {
    await as(a);
    const demoClub = (await db.query("select create_club('Bislett løpeklubb','Kun lokal visningstest','open') id")).rows[0].id;
    const members = [a, b, c];
    for (let i = 4; i <= 20; i++) {
      const id = `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`;
      await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)", [id, JSON.stringify({display_name:`Medlem ${i} (test)`})]);
      members.push(id);
    }
    for (const member of members.slice(1)) await db.query("insert into club_members(club_id,user_id) values($1,$2)", [demoClub, member]);
    const courses = [
      ['St. Hanshaugen', b, [[59.925,10.742],[59.927,10.742],[59.928,10.745],[59.928,10.747],[59.926,10.749],[59.924,10.746]]],
      ['Bislett', a, [[59.923,10.734],[59.925,10.733],[59.926,10.731],[59.925,10.728],[59.923,10.728],[59.922,10.731]]],
      ['Slottsparken', c, [[59.917,10.725],[59.918,10.723],[59.920,10.724],[59.921,10.727],[59.920,10.730],[59.918,10.728]]],
      ['Langs Akerselva', members[3], [[59.919,10.754],[59.921,10.753],[59.923,10.755],[59.925,10.756],[59.927,10.755]]],
    ];
    for (const [name, owner, points] of courses) await db.query("insert into turfs(name,owner_id,club_id,route,distance_m,seconds) values($1,$2,$3,$4::jsonb,1200,360)", [name, owner, demoClub, JSON.stringify(points.map(([latitude,longitude])=>({latitude,longitude})))]);
  }
  await as(a);
  await db.exec("set role authenticated");
  let current = a;
  const users = {
    [a]: { id: a, user_metadata: { display_name: "Alex (test)" } },
    [b]: { id: b, user_metadata: { display_name: "Mina (test)" } },
  };
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const session = (id) => ({
    access_token: `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: id, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 7200 })}.local-only`,
    refresh_token: "local-only",
    expires_in: 7200,
    expires_at: Math.floor(Date.now() / 1000) + 7200,
    token_type: "bearer",
    user: {
      ...users[id],
      aud: "authenticated",
      role: "authenticated",
      email: "fixture@example.invalid",
      app_metadata: { provider: "email" },
      created_at: new Date().toISOString(),
    },
  });
  const footballPreview = process.env.VYRO_UI_SCENARIO === "football-summary";
  const securityPreview = process.env.VYRO_UI_SCENARIO === "security";
  const sampleRoute = [
    { latitude: 59.914, longitude: 10.75 },
    { latitude: 59.916, longitude: 10.751 },
  ];
  const fixtureState = {
    version: 2,
    state: {
      onboarded: true,
      name: "Alex (test)",
      examplesVisible: false,
      theme: "light",
      workouts: footballPreview || securityPreview
        ? [
            {
              id: "local-football",
              ownerId: a,
              source: "gps",
              sport: "Fotball",
              title: "Fotball · kun lokal visningstest",
              seconds: 647,
              distance: 0.32,
              route: sampleRoute,
              notes: "",
              visibility: "private",
              date: "2026-10-28T12:00:00Z",
            },
          ]
        : [],
      ...(footballPreview
        ? {
            recording: {
              status: "finishing",
              sport: "Fotball",
              mode: "gps",
              seconds: 11,
              distance: 0.01,
              startedAt: null,
              lastFix: null,
              route: [sampleRoute],
              ownerId: a,
            },
          }
        : {}),
    },
  };
  const fixtureMarker = footballPreview
    ? "football-summary-fixture"
    : securityPreview ? "security-fixture-v1" : "social-fixture-v2";
  const script = `<script>if(!sessionStorage.getItem(${JSON.stringify(fixtureMarker)})){localStorage.clear();localStorage.setItem('sb-diviitenhbidwrcpmkxr-auth-token',${JSON.stringify(JSON.stringify(session(a)))});localStorage.setItem('sb-127-auth-token',localStorage.getItem('sb-diviitenhbidwrcpmkxr-auth-token'));localStorage.setItem('vyro-prototype-v1',${JSON.stringify(JSON.stringify(fixtureState))});sessionStorage.setItem(${JSON.stringify(fixtureMarker)},'yes');}const originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const url=typeof input==='string'?input:input.url||String(input);if(url.includes('.supabase.co/')){const u=new URL(url);return originalFetch('/fixture-api'+u.pathname+u.search,init);}return originalFetch(input,init);};document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.textContent='LOKAL TEST · INGEN EKTE BRUKERE';b.style='position:fixed;bottom:0;right:0;background:#11182C;color:white;z-index:99999;font:8px sans-serif;padding:2px;pointer-events:none';document.body.appendChild(b);});</script>`;
  const root = path.resolve(__dirname, process.env.VYRO_UI_ROOT || "../dist");
  const images = new Map();
  let queue = Promise.resolve();
  const server = http.createServer((req, res) => {
    queue = queue
      .then(async () => {
        const url = new URL(req.url, "http://127.0.0.1:8103");
        try {
          res.setHeader("Cache-Control", "no-store");
          if (url.pathname === "/fixture-worker.js") {
            res.setHeader("Content-Type", "application/javascript");
            res.end(
              `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.hostname.endsWith('.supabase.co'))event.respondWith(fetch('/fixture-api'+u.pathname+u.search));});`,
            );
            return;
          }
          if (
            url.pathname.startsWith("/fixture-api") ||
            /^\/(auth|rest|storage)\/v1\//.test(url.pathname)
          ) {
            res.setHeader("Content-Type", "application/json");
            const ep = url.pathname.replace("/fixture-api", "");
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const bytes = Buffer.concat(chunks);
            const body =
              bytes.length &&
              req.headers["content-type"]?.includes("application/json")
                ? JSON.parse(bytes)
                : {};
            const auth = req.headers.authorization?.split(".")[1];
            if (auth) {
              const id = JSON.parse(Buffer.from(auth, "base64url")).sub;
              if (users[id]) current = id;
            }
            await as(current);
            let result = [];
            const rows = async (sql, args = []) =>
              (await db.query(sql, args)).rows;
            const filter = (field) =>
              url.searchParams.get(field)?.replace(/^eq\./, "");
            if (ep === "/auth/v1/user") result = session(current).user;
            else if (["/rest/v1/backup_vaults", "/rest/v1/encrypted_workout_backups", "/rest/v1/workout_backups"].includes(ep)) {
              const table = ep.split("/").at(-1);
              if (req.method === "POST" && table === "backup_vaults")
                await db.query("insert into backup_vaults(owner_id,key_id,verifier) values($1,$2,$3) on conflict do nothing", [current,body.key_id,body.verifier]);
              if (req.method === "POST" && table === "encrypted_workout_backups")
                await db.query("insert into encrypted_workout_backups(owner_id,key_id,local_id,ciphertext) values($1,$2,$3,$4) on conflict do nothing", [current,body.key_id,body.local_id,body.ciphertext]);
              if (req.method === "DELETE" && table !== "backup_vaults")
                await db.query(`delete from ${table} where owner_id=$1`, [current]);
              result = await rows(`select * from ${table} where owner_id=$1 order by ${table === 'backup_vaults' ? 'owner_id' : 'local_id'}`, [current]);
              if (url.searchParams.get("local_id")?.startsWith("eq.")) result=result.filter(r=>r.local_id===filter("local_id"));
              if (url.searchParams.get("local_id")?.startsWith("gt.")) result=result.filter(r=>r.local_id>url.searchParams.get("local_id").slice(3));
              if (url.searchParams.get("local_id")?.startsWith("in.(")) {
                const ids=url.searchParams.get("local_id").slice(4,-1).split(',');result=result.filter(r=>ids.includes(r.local_id));
              }
              if (req.headers.accept?.includes("vnd.pgrst.object")) result=result[0] ?? null;
            }
            else if (ep === "/rest/v1/profiles") {
              if (req.method === "PATCH") {
                if (typeof body.is_private === "boolean")
                  await db.query(
                    "update profiles set is_private=$1 where id=$2",
                    [body.is_private, filter("id")],
                  );
              }
              result = await rows(
                "select * from profiles order by display_name",
              );
              const term = url.searchParams
                .get("or")
                ?.match(/ilike\.%([^%]*)%/)?.[1];
              if (term)
                result = result.filter((p) =>
                  `${p.display_name} ${p.username}`
                    .toLowerCase()
                    .includes(term.toLowerCase()),
                );
              if (filter("id")?.startsWith("neq."))
                result = result.filter((p) => p.id !== current);
              if (url.searchParams.get("id")?.startsWith("eq."))
                result = result.filter((p) => p.id === filter("id"));
              if (req.headers.accept?.includes("vnd.pgrst.object"))
                result = result[0] ?? null;
            } else if (ep === "/rest/v1/follow_requests") {
              result = await rows(
                "select r.*,to_jsonb(p) profiles from follow_requests r join profiles p on p.id=r.requester_id",
              );
              if (
                filter("recipient_id") &&
                !filter("recipient_id").startsWith("in.")
              )
                result = result.filter(
                  (r) => r.recipient_id === filter("recipient_id"),
                );
              if (filter("requester_id"))
                result = result.filter(
                  (r) => r.requester_id === filter("requester_id"),
                );
            } else if (ep === "/rest/v1/notification_preferences") {
              if (req.method === "POST")
                await db.query(
                  `insert into notification_preferences(owner_id,category,in_app,push) values($1,$2,$3,$4)
                on conflict(owner_id,category) do update set in_app=excluded.in_app,push=excluded.push`,
                  [body.owner_id, body.category, body.in_app, body.push],
                );
              result = await rows("select * from notification_preferences");
            } else if (ep === "/rest/v1/posts") {
              result = await rows(
                "select n.*,to_jsonb(p) profiles from posts n join profiles p on p.id=n.author_id where n.id=$1",
                [filter("id")],
              );
              if (req.headers.accept?.includes("vnd.pgrst.object"))
                result = result[0] ?? null;
            } else if (ep === "/rest/v1/comments") {
              if (req.method === "POST")
                await db.query(
                  "insert into comments(author_id,post_id,body) values($1,$2,$3)",
                  [body.author_id, body.post_id, body.body],
                );
              if (req.method === "DELETE")
                await db.query(
                  "delete from comments where id=$1 and post_id=$2 and author_id=$3",
                  [filter("id"), filter("post_id"), filter("author_id")],
                );
              result = await rows(
                "select n.*,to_jsonb(p) profiles from comments n join profiles p on p.id=n.author_id where n.post_id=$1 order by n.created_at desc",
                [filter("post_id")],
              );
            } else if (["/rest/v1/likes", "/rest/v1/reposts"].includes(ep)) {
              const table = ep.endsWith("/likes") ? "likes" : "reposts";
              result = await rows(`select * from ${table} where post_id=$1`, [
                filter("post_id"),
              ]);
              if (filter("user_id"))
                result = result.filter((r) => r.user_id === filter("user_id"));
              res.setHeader(
                "Content-Range",
                `0-${Math.max(0, result.length - 1)}/${result.length}`,
              );
            } else if (ep === "/rest/v1/social_notifications") {
              if (req.method === "PATCH")
                await db.query(
                  "update social_notifications set read_at=now() where recipient_id=$1",
                  [current],
                );
              result = await rows(
                "select n.*,to_jsonb(p) profiles from social_notifications n join profiles p on p.id=n.actor_id order by n.created_at desc,n.id desc",
              );
              if (req.method === "HEAD") {
                res.setHeader(
                  "Content-Range",
                  `0-0/${result.filter((n) => !n.read_at).length}`,
                );
                res.end();
                return;
              }
            } else if (ep === "/rest/v1/clubs") {
              result = await rows(
                "select c.*,jsonb_build_array(jsonb_build_object('count',(select count(*) from club_members m where m.club_id=c.id))) club_members from clubs c order by created_at desc",
              );
              if (filter("id"))
                result = result.find((x) => x.id === filter("id")) ?? null;
            } else if (ep === "/rest/v1/club_members") {
              result = await rows(
                "select m.*,to_jsonb(p) profiles,to_jsonb(c) clubs from club_members m join profiles p on p.id=m.user_id join clubs c on c.id=m.club_id",
              );
              if (filter("club_id"))
                result = result.filter((x) => x.club_id === filter("club_id"));
              if (filter("user_id"))
                result = result.filter((x) => x.user_id === filter("user_id"));
              res.setHeader("Content-Range", `0-${Math.max(0,result.length-1)}/${result.length}`);
              if (req.method === "HEAD") { res.end(); return; }
              if (req.headers.accept?.includes("vnd.pgrst.object")) result=result[0]??null;
            } else if (ep === "/rest/v1/turfs") {
              result = await rows("select t.*,jsonb_build_object('display_name',p.display_name,'avatar_path',p.avatar_path) profiles from turfs t join profiles p on p.id=t.owner_id where t.id=$1", [filter("id")]);
              if (req.headers.accept?.includes("vnd.pgrst.object")) result=result[0]??null;
            } else if (ep === "/rest/v1/turf_attempts") {
              result = await rows("select * from turf_attempts where actor_id=$1 and local_id=$2", [current,filter("local_id")]);
              if (req.headers.accept?.includes("vnd.pgrst.object")) result=result[0]??null;
            } else if (ep === "/rest/v1/club_invitations") {
              result = await rows(
                "select i.*,to_jsonb(c) clubs from club_invitations i join clubs c on c.id=i.club_id",
              );
              if (filter("club_id"))
                result = result.filter((x) => x.club_id === filter("club_id"));
              if (filter("invitee_id"))
                result = result.filter(
                  (x) => x.invitee_id === filter("invitee_id"),
                );
            } else if (ep === "/rest/v1/follows") {
              if (req.method === "POST")
                await db.query(
                  "insert into follows(follower_id,following_id) values($1,$2) on conflict do nothing",
                  [body.follower_id, body.following_id],
                );
              if (req.method === "DELETE")
                await db.query(
                  "delete from follows where follower_id=$1 and following_id=$2",
                  [current, filter("following_id")],
                );
              result = await rows(
                "select * from follows where follower_id=$1",
                [current],
              );
            } else if (ep === "/rest/v1/place_posts" && req.method === "DELETE")
              result = await rows(
                "delete from place_posts where id=$1 and author_id=$2 returning id",
                [filter("id"), current],
              );
            else if (ep.startsWith("/rest/v1/rpc/")) {
              const name = ep.split("/").at(-1);
              const rpc = {
                vyro_club_turfs: ["p_club_id", "p_before_updated", "p_before_id"],
                vyro_club_turf_results: ["p_club_id", "p_offset"],
                vyro_block: ["p_target", "p_block"],
                vyro_report: ["p_target", "p_reason", "p_details", "p_post", "p_place"],
                vyro_my_blocks: [],
                vyro_follow: ["p_target", "p_follow"],
                vyro_respond_follow: ["p_requester", "p_accept"],
                vyro_set_avatar: ["p_path"],
                vyro_notification_target: ["p_notice"],
                create_club: ["p_name", "p_description", "p_visibility"],
                join_open_club: ["p_club"],
                set_club_visibility: ["p_club", "p_visibility"],
                vyro_clubs: [
                  "p_kind",
                  "p_limit",
                  "p_before_created_at",
                  "p_before_id",
                ],
                invite_to_club: ["p_club", "p_person"],
                respond_club_invitation: ["p_invitation", "p_accept"],
                leave_club: ["p_club"],
                manage_club: ["p_club", "p_person", "p_delete"],
                publish_place: [
                  "p_id",
                  "p_caption",
                  "p_place_name",
                  "p_audience",
                ],
                vyro_home_feed: [
                  "p_kind",
                  "p_limit",
                  "p_before_created_at",
                  "p_before_id",
                ],
                vyro_turf_events: [],
              };
              if (!Object.hasOwn(rpc, name))
                throw Error("Unsupported test RPC " + name);
              const keys = rpc[name].filter((k) => Object.hasOwn(body, k));
              const args = keys.map((k) => body[k]);
              const q = `${name}(${keys.map((k, i) => `${k}=>$${i + 1}`).join(",")})`;
              result =
                name.startsWith("vyro_") &&
                ![
                  "vyro_follow",
                  "vyro_respond_follow",
                  "vyro_set_avatar",
                  "vyro_notification_target",
                  "vyro_block",
                  "vyro_report",
                ].includes(name)
                  ? await rows(`select * from ${q}`, args)
                  : (await rows(`select ${q} result`, args))[0].result;
            } else if (ep.startsWith("/storage/v1/object")) {
              const bucket = ep.includes("/profile-photos")
                ? "profile-photos"
                : "place-photos";
              const prefix = `/storage/v1/object/${bucket}/`;
              const readprefix = `/storage/v1/object/authenticated/${bucket}/`;
              const signprefix = `/storage/v1/object/sign/${bucket}/`;
              const name = decodeURIComponent(
                ep.startsWith(readprefix)
                  ? ep.slice(readprefix.length)
                  : ep.startsWith(signprefix)
                    ? ep.slice(signprefix.length)
                    : ep.slice(prefix.length),
              );
              if (req.method === "POST" && ep.startsWith(signprefix)) {
                const allowed = await rows(
                  "select name from storage.objects where bucket_id=$1 and name=$2",
                  [bucket, name],
                );
                if (!allowed.length) throw Error("Photo access denied");
                result = {
                  signedURL: `/object/authenticated/${bucket}/${name}`,
                };
              } else if (req.method === "POST" && ep.startsWith(prefix)) {
                await db.query(
                  "insert into storage.objects(bucket_id,name) values($1,$2)",
                  [bucket, name],
                );
                images.set(name, { bytes, mime: req.headers["content-type"] });
                result = { Key: bucket + "/" + name };
              } else if (req.method === "GET") {
                const allowed = await rows(
                  "select name from storage.objects where bucket_id=$1 and name=$2",
                  [bucket, name],
                );
                if (!allowed.length) throw Error("Photo access denied");
                const img = images.get(name);
                res.setHeader("Content-Type", "image/jpeg");
                res.end(img.bytes);
                return;
              } else if (req.method === "DELETE") {
                for (const file of body.prefixes ?? []) {
                  const removed = await rows(
                    "delete from storage.objects where name=$1 returning name",
                    [file],
                  );
                  if (removed.length) images.delete(file);
                }
                result = [];
              }
            } else if (ep === "/rest/v1/activities")
              result = [];
            else {
              res.statusCode = 404;
              result = {
                code: "PGRST202",
                message: "Not implemented in isolated test",
              };
            }
            res.end(JSON.stringify(result));
            return;
          }
          if (url.pathname === "/__phone") {
            const phoneWidth = [320, 375, 393].includes(
              Number(url.searchParams.get("width")),
            )
              ? Number(url.searchParams.get("width"))
              : 393;
            const phoneScreen = footballPreview
              ? url.searchParams.get("screen") === "activity"
                ? "/activity/local-football"
                : "/summary"
              : process.env.VYRO_UI_SCENARIO === "club-zones" ? "/map?view=zones" : [
                    "/notifications",
                    "/settings/notifications",
                    "/settings/privacy",
                    "/edit-profile",
                    "/people",
                  ].includes(url.searchParams.get("screen"))
                ? url.searchParams.get("screen")
                : "/track";
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(
              `<!doctype html><html lang="nb"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VYRO · mobilkontroll</title><style>body{margin:0;background:#e8ebe7;display:grid;place-items:center;min-height:100vh}iframe{width:${phoneWidth}px;height:min(852px,100vh);border:0;background:white;max-width:100vw}</style><iframe title="VYRO i mobilstørrelse" src="${phoneScreen}"></iframe></html>`,
            );
            return;
          }
          let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
          if (
            !file.startsWith(root + path.sep) ||
            !fs.existsSync(file) ||
            fs.statSync(file).isDirectory()
          )
            file = path.join(root, "index.html");
          const ext = path.extname(file);
          res.setHeader(
            "Content-Type",
            {
              ".html": "text/html",
              ".js": "application/javascript",
              ".css": "text/css",
              ".png": "image/png",
              ".ico": "image/x-icon",
            }[ext] || "application/octet-stream",
          );
          res.end(
            ext === ".html"
              ? fs
                  .readFileSync(file, "utf8")
                  .replace(
                    "<head>",
                    "<head>" +
                      script +
                      `<script>navigator.serviceWorker?.register('/fixture-worker.js').catch(()=>{});</script>`,
                  )
              : fs.readFileSync(file),
          );
        } catch (e) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              code: e.code || "TEST_ERROR",
              message: e.message,
            }),
          );
          console.error(e.message);
        }
      })
      .catch((e) => console.error(e));
  });
  server.listen(8103, "127.0.0.1", () =>
    console.log("Isolated social UI fixture http://127.0.0.1:8103"),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
