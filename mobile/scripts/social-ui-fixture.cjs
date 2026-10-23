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
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
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
  const script = `<script>if(!sessionStorage.getItem('social-fixture')){localStorage.clear();localStorage.setItem('sb-diviitenhbidwrcpmkxr-auth-token',${JSON.stringify(JSON.stringify(session(a)))});localStorage.setItem('vyro-prototype-v1',${JSON.stringify(JSON.stringify({ version: 2, state: { onboarded: true, name: "Alex (test)", examplesVisible: false, theme: "light", workouts: [] } }))});sessionStorage.setItem('social-fixture','yes');}const originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const url=typeof input==='string'?input:input.url||String(input);if(url.includes('.supabase.co/')){const u=new URL(url);return originalFetch('/fixture-api'+u.pathname+u.search,init);}return originalFetch(input,init);};document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.textContent='LOKAL TEST · INGEN EKTE BRUKERE';b.style='position:fixed;bottom:0;right:0;background:#11182C;color:white;z-index:99999;font:8px sans-serif;padding:2px;pointer-events:none';document.body.appendChild(b);});</script>`;
  const root = path.resolve(__dirname, "../dist");
  const images = new Map();
  let queue = Promise.resolve();
  const server = http.createServer((req, res) => {
    queue = queue
      .then(async () => {
        const url = new URL(req.url, "http://127.0.0.1:8103");
        try {
          res.setHeader("Cache-Control", "no-store");
          if (url.pathname.startsWith("/fixture-api")) {
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
            else if (ep === "/rest/v1/profiles") {
              result = await rows(
                "select id,display_name,username from profiles where id<>$1 order by display_name",
                [current],
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
            } else if (ep === "/rest/v1/clubs") {
              result = await rows(
                "select c.*,jsonb_build_array(jsonb_build_object('count',(select count(*) from club_members m where m.club_id=c.id))) club_members from clubs c order by created_at desc",
              );
              if (filter("id"))
                result = result.find((x) => x.id === filter("id")) ?? null;
            } else if (ep === "/rest/v1/club_members") {
              result = await rows(
                "select m.*,to_jsonb(p) profiles from club_members m join profiles p on p.id=m.user_id",
              );
              if (filter("club_id"))
                result = result.filter((x) => x.club_id === filter("club_id"));
              if (filter("user_id"))
                result = result.filter((x) => x.user_id === filter("user_id"));
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
              result = name.startsWith("vyro_")
                ? await rows(`select * from ${q}`, args)
                : (await rows(`select ${q} result`, args))[0].result;
            } else if (ep.startsWith("/storage/v1/object")) {
              const prefix = "/storage/v1/object/place-photos/";
              const readprefix =
                "/storage/v1/object/authenticated/place-photos/";
              const name = decodeURIComponent(
                ep.startsWith(readprefix)
                  ? ep.slice(readprefix.length)
                  : ep.slice(prefix.length),
              );
              if (req.method === "POST" && ep.startsWith(prefix)) {
                await db.query(
                  "insert into storage.objects(bucket_id,name) values('place-photos',$1)",
                  [name],
                );
                images.set(name, { bytes, mime: req.headers["content-type"] });
                result = { Key: "place-photos/" + name };
              } else if (req.method === "GET") {
                const allowed = await rows(
                  "select name from storage.objects where bucket_id='place-photos' and name=$1",
                  [name],
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
            } else if (ep === "/rest/v1/activities" || ep === "/rest/v1/turfs")
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
                  .replace("<head>", "<head>" + script)
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
