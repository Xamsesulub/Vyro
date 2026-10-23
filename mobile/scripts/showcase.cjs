/* global __dirname */
// Screenshot-only fixture: serves the real compiled VYRO UI with fictional users.
// Dedicated loopback origin; ALL Supabase requests are diverted locally.
// No production users, workouts or writes. No real location collection.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Buffer } = require("node:buffer");
const root = path.resolve(__dirname, "../dist");
const port = 8103;
const people = ["Ada", "Noah", "Mina", "Leo"].map((name, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  display_name: `${name} (demo)`, username: `${name.toLowerCase()}_demo`,
}));
const user = { id: people[0].id, aud: "authenticated", role: "authenticated",
  email: "demo@example.invalid", user_metadata: { display_name: people[0].display_name },
  app_metadata: { provider: "email" }, created_at: new Date().toISOString() };
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const session = { user, access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", exp: Math.floor(Date.now()/1000)+86400 })}.showcase-only-not-valid-on-supabase`,
  refresh_token: "showcase-only", token_type: "bearer", expires_in: 86400,
  expires_at: Math.floor(Date.now()/1000)+86400 };
const route = [
  [59.920,10.756],[59.924,10.755],[59.927,10.758],[59.930,10.758],
  [59.933,10.760],[59.937,10.761],[59.940,10.763],[59.943,10.765],
].map(([latitude,longitude]) => ({latitude,longitude}));
const posts = [
  { id: "demo-post-1", author_id: people[1].id, profiles: people[1], title: "Eksempel: Morgen langs Akerselva", distance_km: 5.24, seconds: 1812 },
  { id: "demo-post-2", author_id: people[2].id, profiles: people[2], title: "Eksempel: En rolig søndagstur", distance_km: 3.8, seconds: 1440 },
].map((post, i) => ({ ...post, source: "example", sport: "Løping", route,
  audience: "followers", recorded_at: new Date(Date.now()-i*86400000).toISOString(), created_at: new Date().toISOString() }));
const state = { version: 2, state: { onboarded: true, name: "Ada (demo)",
  theme: "light", examplesVisible: true, goal: 20, workouts: [] } };
const script = `<script>
  if (!sessionStorage.getItem('vyro-showcase-seeded')) {
    // This storage belongs only to the isolated screenshot server, never :8081.
    localStorage.clear();
    localStorage.setItem('sb-diviitenhbidwrcpmkxr-auth-token',${JSON.stringify(JSON.stringify(session))});
    localStorage.setItem('vyro-prototype-v1',${JSON.stringify(JSON.stringify(state))});
    sessionStorage.setItem('vyro-showcase-seeded','yes');
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const address = typeof input === 'string' ? input : input.url || String(input);
    const url = new URL(address, location.origin);
    if (url.hostname.endsWith('.supabase.co')) return originalFetch('/showcase-api'+url.pathname+url.search, init);
    return originalFetch(input, init);
  };
  // Do not request physical location in a screenshot/demo session.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (_ok, fail) => fail?.({code:1,message:'Demo uses examples only'});
    navigator.geolocation.watchPosition = (_ok, fail) => { fail?.({code:1,message:'Demo uses examples only'}); return 0; };
    navigator.geolocation.clearWatch = () => {};
  }
  document.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('div');
    badge.textContent = 'DEMO · Fiktive brukere og økter';
    badge.style = 'position:fixed;right:10px;bottom:110px;z-index:99999;background:#11182C;color:#B2FF66;border-radius:8px;padding:6px 10px;font:600 11px system-ui;pointer-events:none';
    document.body.appendChild(badge);
  });
</script>`;
const server = http.createServer((req,res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  res.setHeader("Cache-Control", "no-store");
  try {
    if (url.pathname.startsWith("/showcase-api/")) {
      res.setHeader("Content-Type", "application/json");
      if (!["GET","HEAD"].includes(req.method)) {
        res.writeHead(403); res.end(JSON.stringify({message:"Kun eksempelvisning. Endringer er slått av.",code:"42501"})); return;
      }
      const endpoint = url.pathname.slice("/showcase-api".length);
      let data = [];
      if (endpoint === "/auth/v1/user") data = user;
      else if (endpoint === "/rest/v1/profiles") {
        const search = (url.searchParams.get("display_name") || "").replace(/^ilike\.\*?|%/g, "").toLowerCase();
        data = people.slice(1).filter(p=>!search || p.display_name.toLowerCase().includes(search));
      } else if (endpoint === "/rest/v1/follows") data = people.slice(1,3).map(p=>({follower_id:user.id,following_id:p.id}));
      else if (endpoint === "/rest/v1/posts") data = posts;
      else if (endpoint === "/rest/v1/comments") data = [{id:"demo-comment",author_id:people[2].id,body:"Fin eksempelrute!",profiles:people[2]}];
      else if (endpoint === "/rest/v1/likes") {
        res.setHeader("Content-Range", "0-2/3"); data = [];
      }
      res.end(req.method === "HEAD" ? undefined : JSON.stringify(data)); return;
    }
    let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(404);res.end();return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root,"index.html");
    const ext = path.extname(file);
    res.setHeader("Content-Type", ({".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon",".woff2":"font/woff2"})[ext] || "application/octet-stream");
    const data = fs.readFileSync(file);
    res.end(ext === ".html" ? data.toString().replace("<head>","<head>"+script) : data);
  } catch { res.writeHead(500); res.end("Showcase unavailable"); }
});
server.listen(port,"::1",()=>console.log(`VYRO showcase: http://localhost:${port} — fictional users, no production writes`));
