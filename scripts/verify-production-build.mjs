import assert from "node:assert/strict";

const base = (process.argv[2] || process.env.E2E_BASE_URL || "http://127.0.0.1:3102").replace(/\/+$/, "");
const canonical = "https://evergreenrecycler.in";

async function request(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  return { response, body: await response.text() };
}

const results = new Map();
for (const path of [
  "/", "/about", "/services/e-waste-recycling", "/blog", "/admin/login", "/admin",
  "/documents/login", "/documents", "/api/health", "/robots.txt", "/sitemap.xml",
  "/sitemaps/pages.xml", "/sitemaps/posts.xml", "/sitemaps/categories.xml", "/definitely-not-a-real-page",
]) {
  const result = await request(path);
  results.set(path, result);
  console.log(`${path}\t${result.response.status}\t${result.response.headers.get("content-type") ?? ""}\t${result.response.headers.get("location") ?? ""}`);
}

for (const path of ["/", "/about", "/services/e-waste-recycling", "/blog", "/admin/login", "/documents/login", "/api/health", "/robots.txt", "/sitemap.xml", "/sitemaps/pages.xml", "/sitemaps/posts.xml", "/sitemaps/categories.xml"]) {
  assert.equal(results.get(path).response.status, 200, `${path} must return 200`);
}
assert.equal(results.get("/definitely-not-a-real-page").response.status, 404, "unknown pages must return 404");
assert.ok([302, 303, 307, 308].includes(results.get("/admin").response.status), "/admin must redirect when signed out");
assert.match(results.get("/admin").response.headers.get("location") ?? "", /\/admin\/login/, "/admin must redirect to admin login");
assert.ok([302, 303, 307, 308].includes(results.get("/documents").response.status), "/documents must redirect when signed out");
assert.match(results.get("/documents").response.headers.get("location") ?? "", /\/documents\/login/, "/documents must redirect to document login");
assert.deepEqual(JSON.parse(results.get("/api/health").body), { status: "ok" });

const robots = results.get("/robots.txt").body;
assert.match(robots, /^User-agent: \*$/m);
assert.match(robots, /^Allow: \/$/m);
for (const path of ["/admin", "/api", "/blog/preview", "/documents"]) {
  assert.match(robots, new RegExp(`^Disallow: ${path.replace("/", "\\/")}$`, "m"));
}
assert.match(robots, new RegExp(`^Sitemap: ${canonical.replaceAll("/", "\\/")}\\/sitemap\\.xml$`, "m"));
assert.doesNotMatch(robots, /localhost|127\.0\.0\.1/i);

const sitemapIndex = results.get("/sitemap.xml").body;
assert.match(sitemapIndex, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(sitemapIndex, /<sitemapindex\b/);
const childPaths = ["/sitemaps/pages.xml", "/sitemaps/posts.xml", "/sitemaps/categories.xml"];
for (const path of childPaths) assert.ok(sitemapIndex.includes(`${canonical}${path}`), `sitemap index must include ${path}`);

const allUrls = [];
for (const path of childPaths) {
  const xml = results.get(path).body;
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset\b/);
  allUrls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
}
assert.equal(new Set(allUrls).size, allUrls.length, "sitemap URLs must be unique");
for (const url of allUrls) {
  assert.ok(url.startsWith(`${canonical}/`), `non-canonical sitemap URL: ${url}`);
  assert.doesNotMatch(url, /localhost|127\.0\.0\.1/i);
  assert.doesNotMatch(url, /\/(?:admin|api|documents|auth|blog\/preview)(?:\/|$)/i);
}
for (const expected of [`${canonical}/`, `${canonical}/about`, `${canonical}/services`, `${canonical}/blog`, `${canonical}/contact`]) {
  assert.ok(allUrls.includes(expected), `public sitemap URL missing: ${expected}`);
}

const home = results.get("/").body;
assert.doesNotMatch(home, /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i, "homepage must not be noindex");
const staticAssets = [...new Set([...home.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&")))];
assert.ok(staticAssets.length > 0, "homepage must reference Next.js static assets");
for (const asset of staticAssets.slice(0, 12)) {
  const response = await fetch(`${base}${asset}`);
  assert.equal(response.status, 200, `static asset returned ${response.status}: ${asset}`);
}

console.log("=== ROBOTS.TXT ===");
console.log(robots.trimEnd());
console.log("=== SITEMAP SUMMARY ===");
console.log(JSON.stringify({ sitemapFiles: childPaths.length, urls: allUrls.length, sample: allUrls.slice(0, 8), staticAssetsChecked: Math.min(staticAssets.length, 12) }, null, 2));
