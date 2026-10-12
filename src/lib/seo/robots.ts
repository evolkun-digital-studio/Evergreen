import { SITE_URL } from "@/lib/cms/constants";

// Client-safe robots.txt helpers (the editor validates live; the route uses `finalizeRobots`).

type RobotsIssue = { line: number; level: "error" | "warning"; message: string };

const DIRECTIVES = new Set(["user-agent", "allow", "disallow", "sitemap", "crawl-delay", "host", "clean-param"]);

export const sitemapUrl = () => `${SITE_URL}/sitemap.xml`;

/** The served file: the editor text plus our sitemap line (always present, never duplicated). */
export function finalizeRobots(text: string): string {
  const body = text.replace(/\r\n/g, "\n").trim();
  const hasSitemap = body.split("\n").some((l) => l.trim().toLowerCase() === `sitemap: ${sitemapUrl()}`.toLowerCase());
  return `${body}\n${hasSitemap ? "" : `\nSitemap: ${sitemapUrl()}\n`}`;
}

export function validateRobots(text: string): RobotsIssue[] {
  const issues: RobotsIssue[] = [];
  let groupStarted = false;
  const disallowed: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) return;
    const n = i + 1;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) return issues.push({ line: n, level: "error", message: `Not a valid "Directive: value" line: ${raw.trim()}` });
    const [, name, value] = m;
    const key = name.toLowerCase();
    if (!DIRECTIVES.has(key)) return issues.push({ line: n, level: "warning", message: `Unknown directive "${name}" (ignored by most crawlers).` });
    if (key === "user-agent") {
      groupStarted = true;
      if (!value) issues.push({ line: n, level: "error", message: "User-agent needs a value, e.g. *" });
      return;
    }
    if ((key === "allow" || key === "disallow") && !groupStarted) {
      issues.push({ line: n, level: "error", message: `${name} appears before any User-agent line.` });
    }
    if ((key === "allow" || key === "disallow") && value && !value.startsWith("/") && !value.startsWith("*")) {
      issues.push({ line: n, level: "error", message: `${name} paths must start with "/".` });
    }
    if (key === "disallow") disallowed.push(value);
    if (key === "disallow" && value === "/") issues.push({ line: n, level: "warning", message: "Disallow: / blocks the whole site from crawling." });
    if (key === "sitemap" && !/^https?:\/\//.test(value)) issues.push({ line: n, level: "error", message: "Sitemap must be an absolute URL." });
  });
  for (const required of ["/admin", "/api"]) {
    if (!disallowed.some((d) => d === required || d === `${required}/`)) {
      issues.push({ line: 0, level: "warning", message: `${required} is not disallowed. Admin and API URLs should not be crawled.` });
    }
  }
  return issues;
}
