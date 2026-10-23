/* global __dirname */
// Explicit one-shot draft submission. The private agent token stays in an ignored file.
const fs = require("node:fs");
const path = require("node:path");
const folder = path.resolve(__dirname, "../../docs/showcase/vibeoff");
const credentialsFile = path.resolve(__dirname, "../.env.vibeoff.local");
async function main() {
  const credentials = JSON.parse(fs.readFileSync(credentialsFile, "utf8"));
  if (credentials.buildResponse) throw new Error("A draft was already submitted. Review it instead of creating another.");
  const post = JSON.parse(fs.readFileSync(path.join(folder, "post.json"), "utf8"));
  const form = new FormData();
  for (const [key, value] of Object.entries(post)) {
    if (key !== "shots") form.append(key, value);
  }
  form.append("warranty", "1");
  for (const shot of post.shots) {
    const bytes = fs.readFileSync(path.join(folder, shot.file));
    if (bytes.length > 8 * 1024 * 1024) throw new Error("Screenshot exceeds upload limit.");
    form.append("shot", new Blob([bytes], { type: "image/jpeg" }), shot.file);
    form.append("alt", shot.alt);
  }
  const response = await fetch("https://vibeoff.ai/api/builds", {
    method: "POST", headers: { Authorization: `Bearer ${credentials.token}` }, body: form,
  });
  const result = await response.json();
  if (!response.ok) {
    console.log(JSON.stringify({status: response.status, error: result.error, hint: result.hint}));
    process.exitCode = 1;
    return;
  }
  credentials.buildResponse = result;
  fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
  console.log(JSON.stringify({status: response.status, id: result.id, draft: result.draft, reviewUrl: result.reviewUrl}));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
