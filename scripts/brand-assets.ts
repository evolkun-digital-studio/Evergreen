/**
 * Regenerates the favicon set and default Open Graph image from the supplied logo.
 * Run with: npm run brand:assets
 * Source file: public/brand/evergreen-logo.png
 */
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const PAPER = "#F6F5EF";
const DEEP = "#0A2616";

async function main() {
  const artwork = await readFile("public/brand/evergreen-logo.png");

  // Square raster icons on a paper tile with a little breathing room.
  const tile = async (size: number, out: string) => {
    const inner = Math.round(size * 0.74);
    const art = await sharp(artwork).resize(inner, inner, { fit: "inside" }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
      .composite([{ input: art, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toFile(out);
  };
  await tile(64, "src/app/icon.png");
  await tile(180, "src/app/apple-icon.png");
  await tile(192, "public/brand/evergreen-192.png");
  await tile(512, "public/brand/evergreen-512.png");

  // Use the same unmodified artwork for the social preview.
  const logo = await sharp(artwork).resize({ width: 720 }).png().toBuffer();
  const rings = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><g fill="none" stroke="#B6D433" stroke-opacity=".13">${Array.from(
      { length: 9 },
      (_, i) => `<circle cx="1120" cy="560" r="${90 + i * 70}"/>`,
    ).join("")}</g><rect y="622" width="1200" height="8" fill="#B6D433"/></svg>`,
  );
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: DEEP } })
    .composite([{ input: rings }, { input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile("public/brand/og-default.png");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
