/* global __dirname */
// Temporary, reproducible mitigation for GHSA-gcqx-w48m-w2h4. Upstream 4.3.1
// has no patched release. Reject magic keys on BOTH source and target copies.
// Fail closed when upstream bytes change; never silently patch an unknown version.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.dirname(require.resolve("deepmerge/package.json"));
if (require(path.join(root, "package.json")).version !== "4.3.1")
  throw new Error("Review deepmerge mitigation for new version");
const files = {
  "index.js":
    "12440c84957c1990ea2d5e33dc0091722dc1dc1585c6d20e0c780e568ffa9d30",
  "dist/cjs.js":
    "2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d",
  "dist/umd.js":
    "f33e6596482d1fb5c7c427f8ef92f2aa849eea9223acd974176b2fb27ddbf73a",
};
const original =
  "Object.keys(target).concat(getEnumerableOwnPropertySymbols(target))";
const fixed =
  "Object.keys(target).filter(function(key) { return key !== '__proto__' && key !== 'constructor' && key !== 'prototype' }).concat(getEnumerableOwnPropertySymbols(target))";
for (const [file, hash] of Object.entries(files)) {
  const location = path.join(root, file),
    source = fs.readFileSync(location, "utf8").replace(/\r\n/g, "\n");
  const restored = source.replace(fixed, original);
  if (crypto.createHash("sha256").update(restored).digest("hex") !== hash)
    throw new Error("Unexpected deepmerge source: " + file);
  if (source.includes(original))
    fs.writeFileSync(location, source.replace(original, fixed));
}
console.log("deepmerge prototype-key protection verified.");
