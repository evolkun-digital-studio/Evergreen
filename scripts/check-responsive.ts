/**
 * Responsive checks (Playwright) for every page in the sitemap at 360, 390, 768, 1024, 1280 and 1440 px:
 *   - horizontal page scroll
 *   - visible elements that extend past the viewport (outside a horizontal scroller)
 *   - tap targets (links and buttons) smaller than 44 × 44 px; links inside running text are exempt
 *   - header bar taller than one row (wrapping), phone visible below 1280 px
 *   - headings and paragraphs whose boxes overlap a sibling's
 *
 * Usage: pnpm responsive:check [baseUrl]  (default http://localhost:3100). Writes reports/responsive.json.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/+$/, "");
const WIDTHS = [360, 390, 768, 1024, 1280, 1440];

type Finding = { page: string; width: number; kind: string; detail: string };

async function sitemapPaths(): Promise<string[]> {
  const index = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const paths = new Set<string>(["/"]);
  for (const [, m] of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const xml = await (await fetch(m.replace(/^https?:\/\/[^/]+/, BASE))).text();
    for (const [, loc] of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)) paths.add(new URL(loc).pathname);
  }
  return [...paths];
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript({ content: "window.__name = (f) => f;" });
  const page = await context.newPage();
  const paths = await sitemapPaths();
  const findings: Finding[] = [];

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(BASE + path, { waitUntil: "load" });
      await page.waitForTimeout(400);
      const result = await page.evaluate(() => {
        const out: { kind: string; detail: string }[] = [];
        const vw = document.documentElement.clientWidth;
        const label = (el: Element) => {
          const t = (el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 50);
          return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}> “${t}”`;
        };
        const visible = (el: Element) => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.visibility !== "hidden" && s.display !== "none" && r.width > 0 && r.height > 0 && !el.closest("[aria-hidden='true'], .sr-only");
        };
        const inScroller = (el: Element) => {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
          }
          return false;
        };

        if (document.documentElement.scrollWidth > vw + 1) out.push({ kind: "horizontal-scroll", detail: `scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });

        for (const el of document.querySelectorAll("main *, header *, footer *")) {
          if (!visible(el) || inScroller(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.right > vw + 1 || r.left < -1) out.push({ kind: "overflow", detail: `${label(el)} spans ${Math.round(r.left)}–${Math.round(r.right)}` });
        }

        for (const el of document.querySelectorAll("a, button")) {
          if (!visible(el) || el.closest("#mobile-menu") === null && el.closest("[role='dialog']")) continue;
          const r = el.getBoundingClientRect();
          const display = getComputedStyle(el).display;
          // Links inside running text are exempt (WCAG 2.5.8 inline exception).
          const parentText = (el.parentElement?.textContent ?? "").trim().length;
          const ownText = (el.textContent ?? "").trim().length;
          if (el.tagName === "A" && display === "inline" && parentText > ownText + 2) continue;
          // The compact footer is held to the WCAG 2.5.8 minimum (24px) instead of 44px.
          if (el.closest("footer")) {
            if (r.height < 23.5) out.push({ kind: "tap-target", detail: `${label(el)} ${Math.round(r.width)}×${Math.round(r.height)} (footer min 24)` });
            continue;
          }
          if (r.height < 44 && r.width < 44) out.push({ kind: "tap-target", detail: `${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}` });
          else if (r.height < 44 && display !== "inline") out.push({ kind: "tap-target", detail: `${label(el)} height ${Math.round(r.height)}` });
        }

        const bar = document.querySelector("body header .container > div");
        if (bar && bar.getBoundingClientRect().height > 64) out.push({ kind: "header-wrap", detail: `header bar ${Math.round(bar.getBoundingClientRect().height)}px` });
        const phone = [...document.querySelectorAll("body > div header a[href^='tel:']")].find(visible);
        if (phone && vw < 1280 && !phone.closest("#mobile-menu")) out.push({ kind: "header-phone", detail: "phone visible below 1280 px" });

        // The same photo twice on one page (next/image URLs carry the source path in ?url=).
        const srcs = [...document.querySelectorAll("main img")].map(i => {
          const src = i.getAttribute("src") ?? "";
          try {
            return new URL(src, location.href).searchParams.get("url") ?? src;
          } catch {
            return src;
          }
        });
        for (const s of new Set(srcs.filter((s, i) => s && srcs.indexOf(s) !== i))) out.push({ kind: "duplicate-image", detail: s });

        const blocks = [...document.querySelectorAll("main h1, main h2, main h3, main p")].filter(visible);
        for (let i = 0; i < blocks.length; i++) {
          const a = blocks[i].getBoundingClientRect();
          for (let j = i + 1; j < Math.min(blocks.length, i + 6); j++) {
            if (blocks[i].contains(blocks[j]) || blocks[j].contains(blocks[i])) continue;
            const b = blocks[j].getBoundingClientRect();
            const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (ox > 4 && oy > 4) out.push({ kind: "text-overlap", detail: `${label(blocks[i])} overlaps ${label(blocks[j])}` });
          }
        }
        return out;
      });
      for (const f of result) findings.push({ page: path, width, ...f });
    }
    console.log(`✓ ${width}px: ${paths.length} pages`);
  }
  await browser.close();

  const uniq = [...new Map(findings.map(f => [`${f.kind}|${f.width}|${f.detail}`, f])).values()];
  await mkdir("reports", { recursive: true });
  await writeFile("reports/responsive.json", JSON.stringify({ base: BASE, widths: WIDTHS, pages: paths, findings: uniq }, null, 2));
  for (const f of uniq) console.log(`✗ [${f.kind}] ${f.page} @${f.width}: ${f.detail}`);
  console.log(`${uniq.length} findings. Report: reports/responsive.json`);
  process.exit(uniq.length ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
