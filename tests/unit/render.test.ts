import { describe, expect, it } from "vitest";
import { renderContent } from "@/lib/content/render";
import type { PMNode } from "@/lib/content/types";

const p = (...content: PMNode[]): PMNode => ({ type: "paragraph", content });
const t = (text: string, marks?: PMNode["marks"]): PMNode => ({ type: "text", text, marks });

describe("renderContent", () => {
  it("escapes text and puts matching ids on headings", async () => {
    const r = await renderContent({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 }, content: [t("Rules <2022>")] }, p(t("<script>alert(1)</script>"))],
    });
    expect(r.html).toContain('<h2 id="rules-2022">');
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.toc[0].id).toBe("rules-2022");
  });

  it("drops javascript: links and adds rel to external links", async () => {
    const r = await renderContent({
      type: "doc",
      content: [
        p(
          t("bad", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]),
          t(" cpcb", [{ type: "link", attrs: { href: "https://cpcb.nic.in/", rel: "nofollow", target: "_blank" } }]),
          t(" internal", [{ type: "link", attrs: { href: "/blog/epr-guide" } }]),
        ),
      ],
    });
    expect(r.html).not.toContain("javascript:");
    expect(r.html).toContain('<a href="https://cpcb.nic.in/" target="_blank" rel="noopener nofollow">');
    expect(r.html).toContain('<a href="/blog/epr-guide">');
    expect(r.links.map((l) => l.internal)).toEqual([false, true]);
  });

  it("highlights code with Shiki on the server", async () => {
    const r = await renderContent({
      type: "doc",
      content: [{ type: "codeBlock", attrs: { language: "json", filename: "epr.json" }, content: [t('{"a": 1}')] }],
    });
    expect(r.html).toContain('class="code-filename">epr.json');
    expect(r.html).toMatch(/<pre class="shiki[^"]*"/);
    expect(r.html).toContain("<span style=\"color:");
  });

  it("renders custom blocks", async () => {
    const r = await renderContent(
      {
        type: "doc",
        content: [
          { type: "callout", attrs: { variant: "warning" }, content: [p(t("Deadline"))] },
          { type: "expertQuote", attrs: { quote: "Q", name: "John Mueller", role: "Google", sourceUrl: "https://example.com" } },
          { type: "videoEmbed", attrs: { url: "https://youtu.be/dQw4w9WgXcQ", title: "Demo" } },
          { type: "keyTakeawaysBlock" },
          { type: "faqBlock" },
        ],
      },
      { keyTakeaways: ["One", "Two"], faqs: [{ question: "Is EPR mandatory?", answer: "Yes." }] },
    );
    expect(r.html).toContain('class="callout callout-warning"');
    expect(r.html).toContain('<blockquote cite="https://example.com">');
    expect(r.html).toContain("<cite>");
    expect(r.html).toContain('data-youtube-id="dQw4w9WgXcQ"');
    expect(r.html).not.toContain("<iframe");
    expect(r.html).toContain("<li>Two</li>");
    expect(r.html).toContain("Is EPR mandatory?");
    expect(r.videos[0].youtubeId).toBe("dQw4w9WgXcQ");
    expect(r.wordCount).toBeGreaterThan(5);
  });
});
