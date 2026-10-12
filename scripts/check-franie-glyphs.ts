/**
 * Dev-only check: finds text rendered in Franie that contains characters the trial font lacks
 * (anything outside A–Z a–z 0–9, space and ! , - . ?). Such characters would fall back to the
 * adjusted Arial mid-word — rephrase the text or wrap it in <FontSafe>.
 *
 * Usage: pnpm fonts:check [baseUrl] [path ...]
 * Example: pnpm fonts:check http://localhost:3100 / /blog
 * Exit code 1 when problems are found.
 */
import { chromium } from "@playwright/test";

const [base = "http://localhost:3000", ...paths] = process.argv.slice(2);
const routes = paths.length ? paths : ["/"];

type Hit = { route: string; tag: string; text: string; chars: string[] };

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const hits: Hit[] = [];
  let scanned = 0;

  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "networkidle" });
    // Open the services dropdown so its labels are rendered too.
    await page.getByRole("button", { name: "Services" }).first().hover().catch(() => {});
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      const franieFamily = getComputedStyle(document.body)
        .getPropertyValue("--font-franie")
        .split(",")[0]
        .trim()
        .replace(/['"]/g, "");
      const ok = /^[A-Za-z0-9 !,\-.?\s]$/;
      const found: { tag: string; text: string; chars: string[] }[] = [];
      let count = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const el = node.parentElement;
        const text = node.textContent ?? "";
        // Skip non-rendered text: scripts, SVG, and screen-reader-only labels (never drawn).
        if (!el || !text.trim() || el.closest("script,style,noscript,svg,.sr-only")) continue;
        const first = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/['"]/g, "");
        if (first !== franieFamily) continue;
        count++;
        const bad = [...new Set([...text].filter(ch => !ok.test(ch)))];
        if (bad.length) found.push({ tag: el.tagName.toLowerCase(), text: text.trim().slice(0, 120), chars: bad });
      }
      return { franieFamily, count, found };
    });

    if (!result.franieFamily) throw new Error(`--font-franie is not defined on ${route}`);
    scanned += result.count;
    hits.push(...result.found.map(f => ({ route, ...f })));
  }
  await browser.close();

  console.log(`Scanned ${scanned} Franie text runs on ${routes.length} page(s).`);
  if (!hits.length) {
    console.log("✓ No unsupported characters rendered in Franie.");
    return;
  }
  console.log(`✗ ${hits.length} run(s) contain characters missing from the trial font:\n`);
  for (const h of hits) console.log(`  ${h.route}  <${h.tag}>  [${h.chars.join(" ")}]  "${h.text}"`);
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
