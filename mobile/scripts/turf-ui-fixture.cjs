/* global __dirname */
// Isolated UI verification only. Serves the compiled app on a different origin,
// replaces ALL Supabase fetches with local PGlite, and labels the viewport.
// No real accounts, routes, or production writes. Never bundled in the app.
const { Buffer } = require("node:buffer");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
async function main() {
  const db = new PGlite();
  const henos = "11111111-1111-4111-8111-111111111111";
  const xamse = "22222222-2222-4222-8222-222222222222";
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;
    insert into auth.users values('${henos}','{"display_name":"Henos (test)"}'),('${xamse}','{"display_name":"Xamse (test)"}');`);
  for (const f of fs
    .readdirSync(path.resolve(__dirname, "../../supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(
      fs.readFileSync(
        path.resolve(__dirname, "../../supabase/migrations", f),
        "utf8",
      ),
    );
  const stamp = Date.now() - 3600000;
  const raw = Array.from({ length: 201 }, (_, i) => ({
    latitude: 59.9 + i * 0.0002,
    longitude: 10.7,
    accuracy: 5,
    timestamp: stamp + i * 5000,
  }));
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    henos,
  ]);
  const zone = (
    await db.query(
      "select submit_turf_run('henos-test','Testløypa','gps','Løping',$1::jsonb) as r",
      [
        JSON.stringify(
          raw
            .slice(23, 124)
            .map((p, i) => ({ ...p, timestamp: stamp + i * 6250 })),
        ),
      ],
    )
  ).rows[0].r.turf_id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    xamse,
  ]);
  await db.query(
    "insert into follows(follower_id,following_id) values($1,$2)",
    [xamse, henos],
  );
  await db.exec("set role authenticated");
  const user = {
    id: xamse,
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.invalid",
    user_metadata: { display_name: "Xamse (test)" },
    app_metadata: { provider: "email" },
    created_at: new Date().toISOString(),
  };
  const encoded = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const session = {
    access_token: `${encoded({ alg: "HS256", typ: "JWT" })}.${encoded({ sub: xamse, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.local-fixture-only`,
    refresh_token: "local-only",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  };
  const state = {
    version: 2,
    state: {
      onboarded: true,
      name: "Xamse (test)",
      examplesVisible: false,
      theme: "light",
      workouts: [
        {
          id: "fixture-run",
          title: "Lokal testtur — ikke ekte GPS",
          sport: "Løping",
          distance: 4.4,
          seconds: 1000,
          date: new Date().toISOString(),
          notes: "ISOLATED FIXTURE",
          source: "gps",
          visibility: "private",
          ownerId: xamse,
          turfTrace: raw,
          route: raw.map(({ latitude, longitude }) => ({
            latitude,
            longitude,
          })),
        },
      ],
    },
  };
  const script = `<script>
    if(!sessionStorage.getItem('fixture-seeded')){
      localStorage.clear();
      localStorage.setItem('sb-diviitenhbidwrcpmkxr-auth-token',${JSON.stringify(JSON.stringify(session))});
      localStorage.setItem('vyro-prototype-v1',${JSON.stringify(JSON.stringify(state))});
      sessionStorage.setItem('fixture-seeded','yes');
    }
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      const url=typeof input==='string'?input:input.url||String(input);
      if(url.includes('.supabase.co/')){const u=new URL(url);return originalFetch('/fixture-api'+u.pathname+u.search,init);}
      return originalFetch(input,init);
    };
    document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.textContent='LOKAL TEST · INGEN EKTE GPS';b.style='position:fixed;top:0;right:0;background:#11182C;color:white;z-index:99999;font:10px sans-serif;padding:3px;pointer-events:none';document.body.appendChild(b);});
  </script>`;
  const root = path.resolve(__dirname, "../dist");
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:8102");
    try {
      if (url.pathname.startsWith("/fixture-api")) {
        res.setHeader("Content-Type", "application/json");
        const endpoint = url.pathname.replace("/fixture-api", "");
        let result = [];
        if (endpoint === "/auth/v1/user") result = user;
        else if (endpoint === "/rest/v1/turfs")
          result = (
            await db.query(
              "select t.*, jsonb_build_object('display_name',p.display_name) as profiles from turfs t join profiles p on p.id=t.owner_id order by updated_at desc",
            )
          ).rows;
        else if (endpoint === "/rest/v1/follows")
          result = [{ following_id: henos }];
        else if (endpoint === "/rest/v1/turf_events")
          result = (
            await db.query(
              "select e.*,jsonb_build_object('display_name',a.display_name) as actor,case when p.id is null then null else jsonb_build_object('display_name',p.display_name) end as previous from turf_events e join profiles a on a.id=e.actor_id left join profiles p on p.id=e.previous_owner_id order by created_at desc",
            )
          ).rows;
        else if (endpoint === "/rest/v1/rpc/submit_turf_run") {
          let body = "";
          for await (const chunk of req) body += chunk;
          const p = JSON.parse(body);
          result = (
            await db.query(
              "select submit_turf_run($1,$2,$3,$4,$5::jsonb,$6,$7,$8) as result",
              [
                p.p_local_id,
                p.p_name,
                p.p_source,
                p.p_sport,
                JSON.stringify(p.p_samples),
                p.p_turf_id,
                p.p_revision,
                p.p_extend,
              ],
            )
          ).rows[0].result;
        }
        res.end(JSON.stringify(result));
        return;
      }
      let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep)) {
        file = path.join(root, "index.html");
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
        file = path.join(root, "index.html");
      const ext = path.extname(file);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader(
        "Content-Type",
        {
          ".js": "application/javascript",
          ".html": "text/html",
          ".css": "text/css",
          ".png": "image/png",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
        }[ext] || "application/octet-stream",
      );
      let data = fs.readFileSync(file);
      if (ext === ".html")
        data = Buffer.from(
          data.toString().replace("<head>", "<head>" + script),
        );
      res.end(data);
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ code: e.code || "P0001", message: e.message }));
    }
  });
  server.listen(8102, "127.0.0.1", () =>
    console.log(
      `Isolated turf fixture: http://127.0.0.1:8102/turf?workoutId=fixture-run&turfId=${zone}`,
    ),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
