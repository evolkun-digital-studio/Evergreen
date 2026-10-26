/**
 * Captures the content/typography review set requested for the Evergreen refresh.
 * Usage: npm exec tsx scripts/content-screenshots.ts [baseUrl] [outDir]
 */
import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";

const [baseUrl = "http://localhost:3000", outDir = "screenshots/after-content"] = process.argv.slice(2);
const viewports = [
  { suffix: "1440", width: 1440, height: 900 },
  { suffix: "390", width: 390, height: 844 },
];

async function ready(page: Page, path: string) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();

  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });

    await ready(page, "/");
    await page.screenshot({ path: `${outDir}/hero-${viewport.suffix}.png` });
    await page.locator('[aria-labelledby="about-heading"]').screenshot({
      path: `${outDir}/about-${viewport.suffix}.png`,
    });

    await ready(page, "/services/e-waste-recycling");
    await page.screenshot({ path: `${outDir}/service-${viewport.suffix}.png` });
    await page.close();
  }

  await browser.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
