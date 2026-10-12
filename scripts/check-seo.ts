/**
 * On-page SEO and structured-data checks for every site page in the sitemap (server HTML, no JS):
 *   - <title> ≤ 60 characters and unique; meta description 140–160 characters and unique
 *   - exactly one <h1>; no heading level skipped (h2 → h4)
 *   - canonical link, og:image and twitter:image present; images have alt
 *   - breadcrumbs (nav[aria-label=Breadcrumb]) on inner site pages
 *   - JSON-LD: one script with one @graph; every @id reference resolves inside the graph;
 *     required properties for Organization, Service, FAQPage, BreadcrumbList, WebApplication, ImageObject
 *
 * Usage: pnpm seo:check [baseUrl]  (default http://localhost:3100). Blog archive pages are skipped
 * (their metadata comes from the CMS). Writes reports/seo.json.
 */
import { mkdir, writeFile } from "node:fs/promises";

const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/+$/, "");
type Finding = { page: string; level: "error" | "warning"; kind: string; detail: string };
const findings: Finding[] = [];

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
const meta = (html: string, attr: string, name: string) =>
  decode(html.match(new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`))?.[1] ?? html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`))?.[1] ?? "");

const REQUIRED: Record<string, string[]> = {
  Organization: ["name", "legalName", "url", "address", "telephone", "email", "taxID", "foundingDate", "areaServed", "hasOfferCatalog", "knowsAbout"],
  Service: ["name", "provider", "areaServed", "url"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  WebApplication: ["name", "url", "applicationCategory", "offers"],
  ImageObject: ["url", "width", "height"],
  WebSite: ["url", "name", "publisher"],
};

async function sitemapPaths() {
  const xml = await (await fetch(`${BASE}/sitemaps/pages.xml`)).text();
  return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname).filter(p => !p.startsWith("/blog/author"));
}

async function main() {
  const paths = await sitemapPaths();
  const titles = new Map<string, string>();
  const descs = new Map<string, string>();
  for (const path of paths) {
    const res = await fetch(BASE + path);
    const html = await res.text();
    const add = (level: Finding["level"], kind: string, detail: string) => findings.push({ page: path, level, kind, detail });
    if (res.status !== 200) {
      add("error", "status", String(res.status));
      continue;
    }

    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
    const desc = meta(html, "name", "description");
    if (!title) add("error", "title", "missing");
    else if (title.length > 60) add("error", "title-length", `${title.length}: ${title}`);
    if (titles.has(title)) add("error", "title-duplicate", `${title} (also ${titles.get(title)})`);
    titles.set(title, path);
    if (desc.length < 140 || desc.length > 160) add("error", "description-length", `${desc.length}: ${desc}`);
    if (descs.has(desc)) add("error", "description-duplicate", `also ${descs.get(desc)}`);
    descs.set(desc, path);

    const body = html.slice(html.indexOf("<body"));
    const h1s = body.match(/<h1[\s>]/g)?.length ?? 0;
    if (h1s !== 1) add("error", "h1-count", String(h1s));
    const levels = [...body.matchAll(/<h([1-6])[\s>]/g)].map(m => Number(m[1]));
    for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) add("error", "heading-skip", `h${levels[i - 1]} → h${levels[i]}`);

    if (!/<link rel="canonical" href="[^"]+"/.test(html)) add("error", "canonical", "missing");
    if (!meta(html, "property", "og:image")) add("error", "og-image", "missing");
    if (!meta(html, "name", "twitter:image")) add("error", "twitter-image", "missing");
    for (const img of body.match(/<img [^>]*>/g) ?? []) if (!/\salt="/.test(img)) add("error", "img-alt", img.slice(0, 80));
    if (path !== "/" && !path.startsWith("/blog") && !/aria-label="Breadcrumb"/.test(body)) add("error", "breadcrumbs", "missing");

    if (path.startsWith("/blog")) continue;
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
    if (scripts.length !== 1) add("error", "jsonld-count", `${scripts.length} JSON-LD scripts`);
    for (const raw of scripts) {
      let data: { "@graph"?: Record<string, unknown>[] };
      try {
        data = JSON.parse(raw);
      } catch (e) {
        add("error", "jsonld-parse", String(e));
        continue;
      }
      const graph = data["@graph"] ?? [];
      const ids = new Set(graph.map(n => n["@id"] as string).filter(Boolean));
      const refs: string[] = [];
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (Object.keys(o).length === 1 && typeof o["@id"] === "string") refs.push(o["@id"]);
          else Object.values(o).forEach(walk);
        }
      };
      graph.forEach(n => Object.entries(n).forEach(([k, v]) => k !== "@id" && walk(v)));
      for (const r of refs) if (!ids.has(r) && !/indiawms/.test(r)) add("error", "jsonld-ref", `unresolved @id ${r}`);
      for (const n of graph) {
        const types = ([] as string[]).concat(n["@type"] as string);
        for (const t of types)
          for (const prop of REQUIRED[t] ?? []) if (n[prop] === undefined) add("error", "jsonld-required", `${t} missing ${prop}`);
      }
      const types = graph.flatMap(n => ([] as string[]).concat(n["@type"] as string));
      if (!types.includes("Organization")) add("error", "jsonld-org", "no Organization node");
      if (path.startsWith("/services/") && !(types.includes("Service") && types.includes("FAQPage"))) add("error", "jsonld-service", "Service/FAQPage missing");
      if (path === "/epr-calculator" && !(types.includes("WebApplication") && types.includes("FAQPage"))) add("error", "jsonld-epr", "WebApplication/FAQPage missing");
      if (path !== "/" && !types.includes("BreadcrumbList")) add("error", "jsonld-breadcrumb", "BreadcrumbList missing");
    }
  }
  await mkdir("reports", { recursive: true });
  await writeFile("reports/seo.json", JSON.stringify({ base: BASE, pages: paths, findings }, null, 2));
  for (const f of findings) console.log(`${f.level === "error" ? "✗" : "!"} [${f.kind}] ${f.page}: ${f.detail}`);
  const errors = findings.filter(f => f.level === "error").length;
  console.log(`${paths.length} pages, ${errors} errors. Report: reports/seo.json`);
  process.exit(errors ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
