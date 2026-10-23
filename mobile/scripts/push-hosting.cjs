/* global __dirname */
// Portable Git fallback when Sites returns expiry metadata behind the local clock.
// The Git server still validates the unmodified credential; no access checks change.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.hosting-site");
process.chdir(root);
console.log("Ready for Site credential JSON on stdin (input is hidden).");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
let input = "";
process.stdin.on("data", function receive(chunk) {
  if (chunk.includes("\u0003")) process.exit(130);
  input += chunk;
  if (!input.includes("\n") && !input.includes("\r")) return;
  process.stdin.removeListener("data", receive);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.pause();
  let credential;
  try {
    credential = JSON.parse(input.trim());
    const url = new URL(credential.remote_url);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
        credential.auth_mode !== "http_extra_header" || !credential.token || /[\r\n]/.test(credential.token) ||
        !credential.branch || credential.branch.startsWith("-")) throw new Error("Invalid source credential.");
    const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", VYRO_SITES_AUTH: `Authorization: Bearer ${credential.token}` };
    for (const key of Object.keys(env)) if (key.startsWith("GIT_TRACE") || key === "GIT_CURL_VERBOSE") delete env[key];
    function git(args, network = false) {
      const auth = network ? ["-c", "credential.helper=", "-c", "http.extraHeader=", "-c", "http.followRedirects=false",
        `--config-env=http.${credential.remote_url}.extraHeader=VYRO_SITES_AUTH`] : [];
      const r = spawnSync("git", [...auth, ...args], { cwd: root, env, encoding: "utf8", windowsHide: true });
      if (r.status !== 0) throw new Error((r.stderr || r.error?.message || "Git failed").split(credential.token).join("[redacted]"));
      return r.stdout.trim();
    }
    const ref = `refs/heads/${credential.branch}`;
    const remoteHead = git(["ls-remote", "--heads", credential.remote_url, ref], true).split(/\s+/)[0];
    console.log("Source server accepted the credential.");
    if (!fs.existsSync(path.join(root, ".git"))) {
      if (remoteHead) throw new Error("Remote source already exists; restore it before pushing.");
      git(["init", "--initial-branch", credential.branch, "."]);
    }
    if (fs.realpathSync(git(["rev-parse", "--show-toplevel"])) !== fs.realpathSync(root)) throw new Error("Wrong checkout.");
    git(["add", "--all", "--", "."]);
    git(["-c", "user.name=VYRO deployment", "-c", "user.email=sites@users.noreply.openai.com", "commit", "-m", "Publish Expo web export"]);
    const sha = git(["rev-parse", "HEAD"]);
    git(["push", credential.remote_url, `${sha}:${ref}`], true);
    const pushed = git(["ls-remote", "--heads", credential.remote_url, ref], true).split(/\s+/)[0];
    if (pushed !== sha || git(["status", "--porcelain"])) throw new Error("Source verification failed.");
    console.log(JSON.stringify({ project_id: JSON.parse(fs.readFileSync(".openai/hosting.json", "utf8")).project_id, commit_sha: sha, checkout_path: root }));
  } catch (error) {
    console.error(credential?.token ? error.message.split(credential.token).join("[redacted]") : "Invalid credential input.");
    process.exitCode = 1;
  }
});
