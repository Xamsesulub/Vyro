// Publish actual compiler diagnostics, since Xcode's exit code 65 is not a cause.
// The original build step retains its failure through pipefail.
const fs = require("node:fs");
const path = require("node:path");
const escape = (text) =>
  text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");

for (const file of process.argv.slice(2)) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  // Package-resolution errors explain the cause on the following lines.
  const errors = [...new Set(lines.flatMap((line, index) =>
    /\b(?:fatal )?error:/.test(line)
      ? [lines.slice(index, index + 8).join("\n").trim().slice(0, 10000)]
      : [],
  ))];
  const selected = errors.slice(0, 15);
  for (const error of selected) console.log(`::error::${escape(error)}`);
  if (process.env.GITHUB_STEP_SUMMARY && selected.length) {
    // Escape HTML so paths and diagnostics remain literal in the Markdown block.
    const content = selected.join("\n").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `\n### ${path.basename(file)}\n\n<pre>${content}</pre>\n\nFull compiler output is saved in the apple-build-logs artifact.\n`);
  }
}
