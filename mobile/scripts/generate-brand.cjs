// Render the shared Tabler "run" geometry into native/web assets.
// Artwork attribution and MIT license: ../THIRD_PARTY_NOTICES.md.
const { writeFile } = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const mark = require("../src/theme/runnerMark.json");

const assetDirectory = path.join(__dirname, "../assets");
// Match src/theme/tokens.ts; keep the launcher background fully opaque for iOS.
const navy = "#11182C";
const lime = "#B2FF78";

function svg({ size, scale, color = lime, background }) {
  const extent = size * scale;
  const offset = (size - extent) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}
    <svg x="${offset}" y="${offset}" width="${extent}" height="${extent}" viewBox="${mark.viewBox}">
      <path d="${mark.path}" transform="translate(1 0)" fill="none" stroke="${color}" stroke-width="${mark.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
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
  await render("icon.png", { size: 1024, scale: 0.8, background: navy });
  await render("favicon.png", { size: 64, scale: 0.86, background: navy });
  // Keep the entire runner inside Android's central 66/108 safe circle.
  const foreground = { size: 1024, scale: 0.64 };
  await render("adaptive-icon.png", foreground);
  await render("android-icon-foreground.png", foreground);
  await render("android-icon-monochrome.png", {
    ...foreground,
    color: "#FFFFFF",
  });
  await render("splash-icon.png", foreground);
  await writeFile(
    path.join(assetDirectory, "android-icon-background.png"),
    await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: navy },
    })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
