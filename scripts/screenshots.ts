/**
 * Desktop (1440px) and mobile (390px) screenshots for phase reviews.
 * Usage: pnpm tsx scripts/screenshots.ts <baseUrl> <outDir> [path ...]
 * Example: pnpm tsx scripts/screenshots.ts http://localhost:3100 screenshots / /about
 */
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base = "http://localhost:3000", outDir = "screenshots", ...paths] = process.argv.slice(2);
const routes = paths.length ? paths : ["/"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const systemChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch(existsSync(systemChrome) ? { executablePath: systemChrome } : undefined);
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: "load" });
      await page.waitForTimeout(500);
      // Wheel-scroll through once (works with Lenis) so reveals fire, then return to the top.
      const height = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < height; y += 400) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(70);
      }
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.mouse.wheel(0, -height * 2);
      await page.waitForTimeout(1500);
      const slug = route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "_");
      await page.screenshot({ path: `${outDir}/${slug}-${vp.name}.png`, fullPage: true });
      console.log(`✓ ${slug}-${vp.name}.png`);
    }
    await page.close();
  }
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
