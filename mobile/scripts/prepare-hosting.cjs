/* global __dirname */
// Prepare only Expo's public web export for the dedicated Sites source checkout.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const mobile = path.resolve(__dirname, "..");
const exported = path.join(mobile, "dist");
const checkout = path.join(mobile, ".hosting-site");
const manifest = JSON.parse(fs.readFileSync(path.join(mobile, ".openai/hosting.json"), "utf8"));
if (!manifest.project_id || !fs.existsSync(path.join(exported, "index.html"))) {
  throw new Error("A saved Site identity and successful Expo web export are required.");
}
const identityFile = path.join(checkout, ".openai/hosting.json");
if (fs.existsSync(identityFile) && JSON.parse(fs.readFileSync(identityFile, "utf8")).project_id !== manifest.project_id) {
  throw new Error("Refusing to overwrite a different Site identity.");
}
const files = [];
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Export must not contain symlinks.");
    if (entry.isDirectory()) { inspect(file); continue; }
    const relative = path.relative(exported, file).replaceAll("\\", "/");
    if (entry.name.startsWith(".") || /\.(map|pem|key)$/i.test(relative)) throw new Error("Unexpected private/debug file in export.");
    const bytes = fs.readFileSync(file);
    if (/\.(js|html|json)$/i.test(file) && /sb_secret_[A-Za-z0-9_-]{15,}|\bsk\.[A-Za-z0-9_-]{12}|"role"\s*:\s*"service_role"|vyro-showcase-seeded/.test(bytes.toString())) {
      throw new Error("Unexpected credential or screenshot fixture in export.");
    }
    files.push({ file: relative, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
  }
}
inspect(exported);
fs.mkdirSync(path.dirname(identityFile), { recursive: true });
fs.writeFileSync(identityFile, JSON.stringify(manifest, null, 2) + "\n");
const publishedAssets = path.resolve(checkout, "dist");
// Replace only this checkout's generated export; never keep obsolete bundles.
if (path.dirname(publishedAssets) !== fs.realpathSync(checkout)) {
  throw new Error("Unexpected export target outside the hosting checkout.");
}
if (fs.existsSync(publishedAssets)) {
  if (fs.lstatSync(publishedAssets).isSymbolicLink()) throw new Error("Unexpected export symlink.");
  fs.rmSync(publishedAssets, { recursive: true });
}
fs.cpSync(exported, publishedAssets, { recursive: true });
fs.writeFileSync(path.join(checkout, ".gitignore"), ".sites-runtime/\nnode_modules/\n*.log\n");
fs.writeFileSync(path.join(checkout, "README.md"), "# VYRO web export\n\nGenerated from the existing React Native / Expo app. Only the public web export is hosted here. Authentication and private data remain protected by Supabase Auth and RLS. No screenshot fixture, local environment files, credentials or user records are included.\n");
fs.writeFileSync(path.join(checkout, "export-manifest.json"), JSON.stringify({ project_id: manifest.project_id, files }, null, 2) + "\n");
console.log(JSON.stringify({ checkout, project_id: manifest.project_id, files: files.length, bytes: files.reduce((sum,file)=>sum+file.bytes,0) }));
