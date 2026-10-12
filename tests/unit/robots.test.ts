import { describe, expect, it } from "vitest";
import { finalizeRobots, sitemapUrl, validateRobots } from "@/lib/seo/robots";
import { DEFAULT_ROBOTS_TXT } from "@/lib/cms/defaults";

describe("robots.txt", () => {
  it("default rules are valid and block admin, api and previews", () => {
    expect(validateRobots(DEFAULT_ROBOTS_TXT)).toEqual([]);
    expect(DEFAULT_ROBOTS_TXT).toMatch(/Disallow: \/blog\/preview/);
  });
  it("always appends the sitemap exactly once", () => {
    const once = finalizeRobots(DEFAULT_ROBOTS_TXT);
    expect(once.match(/Sitemap:/g)).toHaveLength(1);
    expect(once).toContain(`Sitemap: ${sitemapUrl()}`);
    expect(finalizeRobots(once).match(/Sitemap:/g)).toHaveLength(1);
  });
  it("flags rules before User-agent, bad paths and missing admin block", () => {
    const issues = validateRobots("Disallow: /x\nUser-agent: *\nAllow: nope\nFoo: bar\nSitemap: /s.xml");
    const messages = issues.map((i) => i.message).join("\n");
    expect(messages).toMatch(/before any User-agent/);
    expect(messages).toMatch(/must start with "\/"/);
    expect(messages).toMatch(/Unknown directive "Foo"/);
    expect(messages).toMatch(/absolute URL/);
    expect(messages).toMatch(/\/admin is not disallowed/);
  });
});
