/**
 * Link and button checker (Playwright).
 * Crawls every page in the sitemap plus every internal link found in the header, mobile menu and
 * footer, at 1440 px and 390 px, and reports:
 *   - broken internal links (non-200) and failing external links
 *   - href="#", empty href, javascript: links
 *   - anchors (#id) that point to a missing ID
 *   - mailto: without a valid address or subject, tel: not in +<digits> form, WhatsApp links not
 *     in https://wa.me/<digits>?text=<message> form
 *   - external links without target="_blank" rel="noopener noreferrer"
 *   - buttons with no action (not a form submit and no React event handler)
 * plus interaction checks: the mobile menu closes on Esc and on navigation, the Services dropdown
 * opens and closes by keyboard.
 *
 * Usage: npm run links:check -- [baseUrl]   (default http://localhost:3100; start the app first)
 * Options: --no-external (skip fetching external URLs)
 * Exit code 1 when any error is found. The JSON report is written to reports/links.json.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";

const args = process.argv.slice(2);
const BASE = (args.find(a => !a.startsWith("--")) ?? "http://localhost:3100").replace(/\/+$/, "");
const CHECK_EXTERNAL = !args.includes("--no-external");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

type Issue = { level: "error" | "warning"; page: string; viewport: string; kind: string; detail: string };
type LinkInfo = { href: string; raw: string | null; text: string; target: string | null; rel: string | null; inMenu: boolean };
type ButtonInfo = { text: string; type: string; inForm: boolean; hasHandler: boolean; disabled: boolean };

const issues: Issue[] = [];
const add = (i: Issue) => issues.push(i);

type FetchResult = { status: number; ids?: Set<string>; tlsChain?: boolean };
const statusCache = new Map<string, Promise<FetchResult>>();
// Servers that omit their intermediate certificate: browsers repair the chain (AIA fetching), Node does not.
const TLS_CHAIN_ERRORS = new Set(["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"]);

/** Fetch a URL once; for internal HTML pages also collect the element IDs (for #anchor checks). */
function fetchStatus(url: string, internal: boolean) {
  const key = url.split("#")[0];
  if (!statusCache.has(key)) {
    statusCache.set(
      key,
      (async (): Promise<FetchResult> => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch(key, {
              redirect: "follow",
              signal: AbortSignal.timeout(internal ? 30_000 : 25_000),
              headers: { "User-Agent": "Mozilla/5.0 (compatible; EvergreenLinkCheck/1.0)", Accept: "text/html,application/pdf,*/*" },
            });
            let ids: Set<string> | undefined;
            if (internal && (res.headers.get("content-type") ?? "").includes("text/html")) {
              const html = await res.text();
              ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
            } else {
              await res.body?.cancel();
            }
            return { status: res.status, ids };
          } catch (err) {
            const code = (err as { cause?: { code?: string } }).cause?.code;
            if (code && TLS_CHAIN_ERRORS.has(code)) return { status: 0, tlsChain: true };
            if (attempt === 1) return { status: 0 };
          }
        }
        return { status: 0 };
      })(),
    );
  }
  return statusCache.get(key)!;
}

async function sitemapPaths(): Promise<string[]> {
  const index = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const paths = new Set<string>(["/"]);
  for (const m of maps) {
    const xml = await (await fetch(m.replace(/^https?:\/\/[^/]+/, BASE))).text();
    for (const [, loc] of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)) paths.add(new URL(loc).pathname);
  }
  return [...paths];
}

async function collect(page: Page): Promise<{ links: LinkInfo[]; buttons: ButtonInfo[]; ids: string[] }> {
  return page.evaluate(() => {
    const reactProps = (el: Element) => {
      const key = Object.keys(el).find(k => k.startsWith("__reactProps"));
      return key ? ((el as unknown as Record<string, Record<string, unknown>>)[key] ?? {}) : {};
    };
    const handlerKeys = ["onClick", "onPointerDown", "onMouseDown", "onKeyDown", "onPointerUp", "onTouchStart"];
    const links = [...document.querySelectorAll("a")].map(a => ({
      href: a.href,
      raw: a.getAttribute("href"),
      text: (a.textContent || a.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 60),
      target: a.getAttribute("target"),
      rel: a.getAttribute("rel"),
      inMenu: !!a.closest("#mobile-menu"),
    }));
    const buttons = [...document.querySelectorAll("button")].map(b => {
      const props = reactProps(b);
      return {
        text: (b.textContent || b.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 60),
        type: b.getAttribute("type") ?? "submit",
        inForm: !!b.form,
        hasHandler: handlerKeys.some(k => typeof props[k] === "function"),
        disabled: b.disabled,
      };
    });
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
    return { links, buttons, ids };
  });
}

function checkLinkFormat(l: LinkInfo, pagePath: string, viewport: string) {
  const at = { page: pagePath, viewport };
  const raw = (l.raw ?? "").trim();
  if (l.raw === null || raw === "") return add({ ...at, level: "error", kind: "empty-href", detail: `“${l.text}”` });
  if (raw === "#") return add({ ...at, level: "error", kind: "hash-href", detail: `“${l.text}”` });
  if (raw.startsWith("javascript:")) return add({ ...at, level: "error", kind: "javascript-href", detail: `“${l.text}”` });
  if (raw.startsWith("mailto:")) {
    const [addr, query = ""] = raw.slice(7).split("?");
    // Share links (mailto:?subject=…) may leave the address empty on purpose.
    if (addr && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(decodeURIComponent(addr))) add({ ...at, level: "error", kind: "mailto-format", detail: raw });
    if (!/(^|&)subject=/.test(query)) add({ ...at, level: "error", kind: "mailto-subject", detail: raw });
    return;
  }
  if (raw.startsWith("tel:")) {
    if (!/^tel:\+\d{10,15}$/.test(raw)) add({ ...at, level: "error", kind: "tel-format", detail: raw });
    return;
  }
  if (/wa\.me|whatsapp\.com/.test(raw)) {
    if (!/^https:\/\/wa\.me\/\d{10,15}\?text=.+/.test(raw) && !/^https:\/\/(api\.)?whatsapp\.com\/send\?text=/.test(raw))
      add({ ...at, level: "error", kind: "whatsapp-format", detail: raw });
  }
  const url = new URL(l.href);
  const internal = url.origin === new URL(BASE).origin;
  if (!internal && /^https?:$/.test(url.protocol)) {
    const rel = (l.rel ?? "").split(/\s+/);
    if (l.target !== "_blank" || !rel.includes("noopener") || !rel.includes("noreferrer"))
      add({ ...at, level: "error", kind: "external-attrs", detail: `${raw} (target=${l.target ?? "none"} rel=${l.rel ?? "none"})` });
  }
}

async function checkPage(page: Page, path: string, viewport: string, found: Set<string>) {
  const res = await page.goto(BASE + path, { waitUntil: "load" });
  if (!res || res.status() !== 200) {
    add({ level: "error", page: path, viewport, kind: "page-status", detail: String(res?.status()) });
    return { links: [] as LinkInfo[] };
  }
  await hydrated(page).catch(() => {});
  const { links, buttons, ids } = await collect(page);
  const pageIds = new Set(ids);
  for (const l of links) {
    checkLinkFormat(l, path, viewport);
    if (!l.href || !/^https?:/.test(l.href)) continue;
    const url = new URL(l.href);
    if (url.origin === new URL(BASE).origin) {
      found.add(url.pathname);
      if (url.hash && url.pathname === path && !pageIds.has(decodeURIComponent(url.hash.slice(1))))
        add({ level: "error", page: path, viewport, kind: "missing-anchor", detail: `${l.raw} (“${l.text}”)` });
    }
  }
  for (const b of buttons) {
    if (b.disabled) continue;
    const ok = (b.type === "submit" && b.inForm) || b.hasHandler;
    if (!ok) add({ level: "error", page: path, viewport, kind: "button-no-action", detail: `“${b.text}” type=${b.type}` });
  }
  return { links };
}

/** Wait until React has hydrated the header (its buttons carry React props), so clicks have handlers. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const b = document.querySelector("header button");
    return !!b && Object.keys(b).some(k => k.startsWith("__reactProps"));
  });

async function interactionChecks(page: Page) {
  // Mobile menu: opens, closes on Esc, closes on navigation.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await hydrated(page);
  const open = page.getByRole("button", { name: "Open menu" });
  await open.click();
  const dialog = page.locator("#mobile-menu");
  if (!(await dialog.isVisible())) add({ level: "error", page: "/", viewport: "mobile", kind: "menu", detail: "Mobile menu did not open" });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached", timeout: 3000 }).catch(() => add({ level: "error", page: "/", viewport: "mobile", kind: "menu", detail: "Mobile menu did not close on Esc" }));
  await open.click();
  await dialog.getByRole("link", { name: "About", exact: true }).click();
  await page.waitForURL(`${BASE}/about`);
  await dialog.waitFor({ state: "detached", timeout: 3000 }).catch(() => add({ level: "error", page: "/", viewport: "mobile", kind: "menu", detail: "Mobile menu stayed open after navigation" }));

  // Services dropdown by keyboard (desktop).
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await hydrated(page);
  const services = page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Services" });
  await services.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(el => el?.getAttribute("aria-expanded") === "true", await services.elementHandle(), { timeout: 2000 }).catch(() => {});
  if ((await services.getAttribute("aria-expanded")) !== "true") add({ level: "error", page: "/", viewport: "desktop", kind: "dropdown", detail: "Services dropdown did not open with Enter" });
  await page.keyboard.press("Tab");
  const panelId = await services.getAttribute("aria-controls");
  const focusedInPanel = await page.evaluate(id => !!id && !!document.getElementById(id)?.contains(document.activeElement), panelId);
  if (!focusedInPanel) add({ level: "warning", page: "/", viewport: "desktop", kind: "dropdown", detail: "Tab did not move into the Services panel" });
  await page.keyboard.press("Escape");
  if ((await services.getAttribute("aria-expanded")) !== "false") add({ level: "error", page: "/", viewport: "desktop", kind: "dropdown", detail: "Services dropdown did not close on Esc" });
}

async function main() {
  const browser = await chromium.launch();
  // tsx (esbuild keepNames) wraps functions passed to page.evaluate with __name(); define it in the page.
  const context = await browser.newContext();
  await context.addInitScript({ content: "window.__name = (f) => f;" });
  const queue = await sitemapPaths();
  const seen = new Set<string>();
  const externals = new Map<string, string>();
  const internals = new Map<string, string>();

  for (const vp of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const found = new Set<string>(queue);
    const todo = [...queue];
    const visited = new Set<string>();
    while (todo.length) {
      const path = todo.shift()!;
      if (visited.has(path)) continue;
      visited.add(path);
      seen.add(path);
      const { links } = await checkPage(page, path, vp.name, found);
      // Open the mobile menu on the first page so its links are crawled too.
      if (vp.name === "mobile" && path === "/") {
        await page.getByRole("button", { name: "Open menu" }).click();
        const menu = await collect(page);
        for (const l of menu.links) checkLinkFormat(l, `${path} (menu)`, vp.name);
        links.push(...menu.links.filter(l => l.inMenu));
        await page.keyboard.press("Escape");
      }
      for (const l of links) {
        if (!/^https?:/.test(l.href)) continue;
        const url = new URL(l.href);
        if (url.origin === new URL(BASE).origin) {
          internals.set(url.pathname + url.hash, path);
          // Crawl internal pages reached from nav/footer/content, except admin, feeds and files.
          if (!/^\/(admin|api|uploads|og)\b|\.(xml|txt|pdf|png|jpe?g|webp|svg)$/.test(url.pathname) && !visited.has(url.pathname)) todo.push(url.pathname);
        } else if (!/^https:\/\/wa\.me\//.test(l.href)) {
          externals.set(l.href, path);
        }
      }
    }
    await page.close();
  }

  // Internal link targets: status 200 and #anchors present on the target page.
  await Promise.all(
    [...internals].map(async ([target, from]) => {
      const [p, hash] = target.split("#");
      const r = await fetchStatus(BASE + p, true);
      if (r.status !== 200) add({ level: "error", page: from, viewport: "any", kind: "broken-internal", detail: `${target} → ${r.status}` });
      else if (hash && r.ids && !r.ids.has(decodeURIComponent(hash))) add({ level: "error", page: from, viewport: "any", kind: "missing-anchor", detail: target });
    }),
  );

  if (CHECK_EXTERNAL) {
    await Promise.all(
      [...externals].map(async ([href, from]) => {
        const r = await fetchStatus(href, false);
        if (r.tlsChain) add({ level: "warning", page: from, viewport: "any", kind: "external-tls-chain", detail: `${href}: server omits its intermediate certificate (opens in browsers)` });
        else if (r.status === 0 || r.status >= 400)
          add({ level: r.status === 403 || r.status === 429 ? "warning" : "error", page: from, viewport: "any", kind: "broken-external", detail: `${href} → ${r.status || "no response"}` });
      }),
    );
  }

  const page = await context.newPage();
  await interactionChecks(page);
  await browser.close();

  // De-duplicate (the same footer issue appears on every page).
  const uniq = [...new Map(issues.map(i => [`${i.level}|${i.kind}|${i.detail}`, i])).values()];
  const errors = uniq.filter(i => i.level === "error");
  const warnings = uniq.filter(i => i.level === "warning");
  await mkdir("reports", { recursive: true });
  await writeFile(
    "reports/links.json",
    JSON.stringify({ base: BASE, pages: [...seen].sort(), internalTargets: internals.size, externalTargets: externals.size, errors, warnings }, null, 2),
  );
  console.log(`Pages crawled: ${seen.size} (×${VIEWPORTS.length} viewports). Internal targets: ${internals.size}. External: ${externals.size}.`);
  for (const i of [...errors, ...warnings]) console.log(`${i.level === "error" ? "✗" : "!"} [${i.kind}] ${i.page} (${i.viewport}): ${i.detail}`);
  console.log(`${errors.length} errors, ${warnings.length} warnings. Report: reports/links.json`);
  process.exit(errors.length ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
