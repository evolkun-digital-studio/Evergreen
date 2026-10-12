import { chromium } from "@playwright/test";

const sizes = [[1920, 1080], [1440, 900], [1366, 768], [1280, 720], [768, 1024], [390, 844], [360, 640]] as const;
const browser = await chromium.launch();
for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
  const r = await page.evaluate(() => {
    const hero = document.getElementById("hero")!;
    const h1 = hero.querySelector("h1")!;
    const box = hero.getBoundingClientRect();
    return {
      h1: getComputedStyle(h1).fontSize,
      top: box.top,
      height: box.height,
      eyebrow: /PAN India pickup$/m.test(hero.innerText.split("\n")[0]) || hero.innerText.includes("Sitapur, Uttar Pradesh ·"),
      ...(() => {
        const btns = [...hero.querySelectorAll("a")].map(a => a.getBoundingClientRect());
        const bar = hero.lastElementChild!.getBoundingClientRect();
        const h1Top = h1.getBoundingClientRect().top;
        const header = document.querySelector("header")!.getBoundingClientRect().bottom;
        return { buttonsToBar: Math.round(bar.top - Math.max(...btns.map(b => b.bottom))), h1BelowHeader: Math.round(h1Top - header) };
      })(),
      epr: [...document.querySelectorAll("header a")].filter(a => a.textContent?.includes("EPR") && a.getClientRects().length).map(a => a.outerHTML.slice(0, 80)),
    };
  });
  const expH = Math.max(600, Math.min(1080, h));
  const gap = h - (r.top + r.height);
  // Click the pause button with the mouse; it must not show a focus ring.
  const btn = page.getByRole("button", { name: /background video/ });
  let ring = "n/a";
  if (await btn.isEnabled().catch(() => false)) {
    await btn.click();
    ring = String(await btn.evaluate(b => b.matches(":focus-visible")));
    await btn.click();
  }
  await page.mouse.move(0, h - 1);
  await page.screenshot({ path: `screenshots/hero-final/home-${w}x${h}.png` });
  console.log(`${w}x${h}`, { ...r, expectedHeight: expH, whiteBelowHero: gap > 0.5 ? gap : 0, pauseFocusVisibleAfterClick: ring });
  await page.close();
}
await browser.close();
