// Render VYRO's owner-provided runner/wordmark, shared with native SVG components.
const { writeFile } = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const mark = require("../src/theme/runnerMark.json");

const assetDirectory = path.join(__dirname, "../assets");
// Match src/theme/tokens.ts; keep the launcher background fully opaque for iOS.
const background = "#FFFFFF";

function svg({
  size,
  scale,
  color = mark.navy,
  background,
  monochrome = false,
}) {
  const extent = size * scale;
  const offset = (size - extent) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${background ? `    <rect width="${size}" height="${size}" fill="${background}"/>` : ""}
    <svg x="${offset}" y="${offset}" width="${extent}" height="${extent}" viewBox="${mark.viewBox}">
      <path d="${mark.path}" fill="${color}"/>
      <path d="${mark.swoosh}" fill="${monochrome ? color : mark.lime}"/>
    </svg>
  </svg>`);
}

async function render(filename, options) {
  let output = sharp(svg(options));
  if (options.background) output = output.removeAlpha();
  await writeFile(
    path.join(assetDirectory, filename),
    await output.png({ compressionLevel: 9 }).toBuffer(),
  );
  console.log(`Generated ${filename} (${options.size} × ${options.size})`);
}

async function main() {
  await render("icon.png", { size: 1024, scale: 0.8, background });
  await render("favicon.png", { size: 64, scale: 0.9, background });
  // Keep the entire runner inside Android's central 66/108 safe circle.
  const foreground = { size: 1024, scale: 0.64 };
  await render("adaptive-icon.png", foreground);
  await render("android-icon-foreground.png", foreground);
  await render("android-icon-monochrome.png", {
    ...foreground,
    color: "#FFFFFF",
    monochrome: true,
  });
  await render("splash-icon.png", foreground);
  await writeFile(
    path.join(assetDirectory, "android-icon-background.png"),
    await sharp({
      create: { width: 1024, height: 1024, channels: 3, background },
    })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );
  const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="315" viewBox="${mark.wordmarkViewBox}"><path d="${mark.path}" fill="${mark.navy}"/><path d="${mark.swoosh}" fill="${mark.lime}"/><path d="${mark.letters}" fill="${mark.navy}" fill-rule="evenodd"/></svg>`;
  await writeFile(path.join(assetDirectory, "brand-wordmark.svg"), wordmark);
  await writeFile(
    path.join(assetDirectory, "brand-mark.svg"),
    svg({ size: 380, scale: 1 }),
  );
  await sharp(Buffer.from(wordmark))
    .png()
    .toFile(path.join(assetDirectory, "brand-wordmark.png"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
