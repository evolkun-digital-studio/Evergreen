import { describe, expect, it } from "vitest";
import { EMAIL_LOGO_CID, renderEmail } from "@/lib/email-template";

const base = {
  preheader: "Your access is ready",
  heading: "Your document access is approved",
  greeting: "Hello Asha,",
  paragraphs: ["Your request has been approved."],
};

describe("renderEmail", () => {
  it("shows the inline logo with alt text at a fixed width", () => {
    const { html } = renderEmail(base);
    expect(html).toContain(`src="cid:${EMAIL_LOGO_CID}"`);
    expect(html).toMatch(/<img[^>]+alt="Evergreen"/);
    expect(html).toMatch(/<img[^>]+width="\d+"/);
  });

  it("renders the heading, greeting and paragraphs", () => {
    const { html } = renderEmail(base);
    for (const part of ["Your document access is approved", "Hello Asha,", "Your request has been approved."]) expect(html).toContain(part);
  });

  it("hides the preheader from view but keeps it for inbox previews", () => {
    const { html } = renderEmail(base);
    expect(html).toMatch(/display:none[^>]*>\s*Your access is ready/);
  });

  it("renders a button that links to the url, and repeats the url as text for mail apps that strip buttons", () => {
    const { html, text } = renderEmail({ ...base, button: { label: "Open documents", url: "https://evergreen.example/documents/access/x.y" } });
    expect(html).toMatch(/<a[^>]+href="https:\/\/evergreen\.example\/documents\/access\/x\.y"[^>]*>\s*Open documents/);
    expect(html.split("https://evergreen.example/documents/access/x.y").length).toBeGreaterThan(2);
    expect(text).toContain("Open documents: https://evergreen.example/documents/access/x.y");
  });

  it("lists facts as labelled rows in both versions", () => {
    const { html, text } = renderEmail({ ...base, facts: [{ label: "Access to", value: "the whole library" }, { label: "Valid until", value: "2 Nov 2026" }] });
    expect(html).toContain("Valid until");
    expect(html).toContain("2 Nov 2026");
    expect(text).toContain("Access to: the whole library");
    expect(text).toContain("Valid until: 2 Nov 2026");
  });

  it("escapes anything a visitor typed so it cannot inject markup", () => {
    const { html, text } = renderEmail({
      ...base,
      greeting: 'Hello <script>alert(1)</script> "Asha",',
      facts: [{ label: "Reason", value: "<img src=x onerror=alert(1)>" }],
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(text).toContain("<script>"); // plain text stays as typed
  });

  it("refuses a button url that is not http(s)", () => {
    const { html } = renderEmail({ ...base, button: { label: "Go", url: "javascript:alert(1)" } });
    expect(html).not.toContain("javascript:");
  });

  it("keeps line breaks in multi-line values", () => {
    expect(renderEmail({ ...base, facts: [{ label: "Reason", value: "line one\nline two" }] }).html).toContain("line one<br>line two");
  });

  it("ends with the company footer", () => {
    const { html, text } = renderEmail(base);
    expect(html).toContain("Ever Green E-Waste Recycling Management");
    expect(html).toContain("Sitapur");
    expect(text).toContain("Ever Green E-Waste Recycling Management");
  });

  it("produces a plain-text version with no markup", () => {
    const { text } = renderEmail({ ...base, button: { label: "Open", url: "https://evergreen.example/x" }, facts: [{ label: "A", value: "B" }] });
    expect(text).not.toMatch(/<\/?[a-z][^>]*>/i);
    expect(text).toContain("Hello Asha,");
  });
});
