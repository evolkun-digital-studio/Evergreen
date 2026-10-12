import { describe, expect, it } from "vitest";
import { extractLinks } from "@/lib/seo/link-checker";
import { SITE_URL } from "@/lib/cms/constants";

describe("extractLinks", () => {
  it("classifies internal, external and image URLs and skips anchors/mailto", () => {
    const html =
      '<p><a href="/blog/x">a</a> <a href="https://cpcb.nic.in/">b</a> <a href="#faq">c</a> <a href="mailto:a@b.c">d</a>' +
      ` <a href="${SITE_URL}/blog/y?a=1&amp;b=2">e</a></p><img src="/uploads/2026/01/a.webp" alt="">`;
    const links = extractLinks(html, "https://cdn.example.com/f.png");
    expect(links).toEqual([
      { url: `${SITE_URL}/blog/x`, type: "internal" },
      { url: "https://cpcb.nic.in/", type: "external" },
      { url: `${SITE_URL}/blog/y?a=1&b=2`, type: "internal" },
      { url: `${SITE_URL}/uploads/2026/01/a.webp`, type: "image" },
      { url: "https://cdn.example.com/f.png", type: "image" },
    ]);
  });
});
