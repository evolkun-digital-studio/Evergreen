import { describe, expect, it } from "vitest";
import { containsKeyword, keywordOccurrences, scorePost, type ScoreInput } from "@/lib/seo-score";
import { analyzeDoc } from "@/lib/seo-score/analyze";
import { averageSentenceLength, fleschReadingEase, passiveRatio, splitSentences, syllables, transitionRatio } from "@/lib/seo-score/readability";
import type { PMNode } from "@/lib/content/types";

const t = (text: string, marks?: PMNode["marks"]): PMNode => ({ type: "text", text, ...(marks ? { marks } : {}) });
const p = (...c: PMNode[]): PMNode => ({ type: "paragraph", content: c });
const h = (level: number, text: string): PMNode => ({ type: "heading", attrs: { level }, content: [t(text)] });
const link = (href: string) => [{ type: "link", attrs: { href } }];
const filler = (n: number) => Array.from({ length: n }, (_, i) => `Producers track plastic packaging data every month in sentence ${i}.`).join(" ");

const richDoc: PMNode = {
  type: "doc",
  content: [
    p(t("EPR compliance is a legal duty for producers. In India, EPR compliance applies to plastic packaging, and 40% of obligations rise each year.")),
    h(2, "What is EPR compliance?"),
    p(t("EPR compliance is the duty to collect and recycle the waste your products create.")),
    p(t(filler(40))),
    h(2, "How do you register?"),
    p(t("Register on the CPCB portal and file annual returns.")),
    { type: "bulletList", content: [{ type: "listItem", content: [p(t("Register"))] }] },
    p(t("See the "), t("CPCB portal", link("https://cpcb.nic.in/")), t(", our "), t("services", link("/#services")), t(" and "), t("guide", link("/blog/epr")), t(".")),
    h(3, "Documents"),
    p(t(filler(40))),
    { type: "image", attrs: { src: "/a.webp", alt: "EPR compliance checklist" } },
    { type: "expertQuote", attrs: { quote: "Track data monthly.", name: "Team", role: "Evergreen" } },
  ],
};

const input = (over: Partial<ScoreInput> = {}): ScoreInput => ({
  title: "EPR Compliance Guide for PIBOs in India",
  slug: "epr-compliance-guide",
  excerpt: "",
  content: richDoc,
  seo: {
    seoTitle: "EPR Compliance Guide for PIBOs in India 2026",
    metaDescription: "EPR compliance explained for producers, importers and brand owners in India: registration, targets, annual returns and how to avoid penalties.",
    focusKeyword: "EPR compliance",
    secondaryKeywords: [],
    canonicalUrl: "",
    breadcrumbEnabled: true,
  },
  ai: {
    aiSummary: "EPR compliance means registering on the CPCB portal, calculating your obligation from what you place on the market, fulfilling it through registered recyclers and filing annual returns on time. The same steps apply across plastic, e-waste and battery rules.",
    keyTakeaways: ["One", "Two", "Three"],
    faqs: [
      { question: "Q1?", answer: "A1" },
      { question: "Q2?", answer: "A2" },
      { question: "Q3?", answer: "A3" },
    ],
    mainEntity: { name: "Extended producer responsibility", sameAs: "https://en.wikipedia.org/wiki/Extended_producer_responsibility" },
    about: [{ name: "Electronic waste", sameAs: "https://en.wikipedia.org/wiki/Electronic_waste" }],
    mentions: [{ name: "CPCB", sameAs: "https://en.wikipedia.org/wiki/Central_Pollution_Control_Board" }],
    contentType: "Glossary",
  },
  schemaExtras: { howToStepCount: 0, videoUrl: "", reviewItemName: "" },
  featuredImage: { set: true, alt: "EPR compliance infographic" },
  author: { hasBio: true, hasCredentials: true, hasProfiles: true },
  modifiedAt: null,
  brokenLinks: 0,
  ...over,
});

describe("readability helpers", () => {
  it("estimates syllables", () => {
    expect(syllables("cat")).toBe(1);
    expect(syllables("recycling")).toBe(3);
    expect(syllables("important")).toBe(3);
    expect(syllables("recycle")).toBe(3);
  });
  it("splits sentences and measures them", () => {
    expect(splitSentences("One two. Three four five! Six?")).toHaveLength(3);
    expect(averageSentenceLength("One two. Three four.")).toBe(2);
  });
  it("Flesch: simple text is easier than dense text", () => {
    expect(fleschReadingEase("The cat sat on the mat. It was warm.")).toBeGreaterThan(80);
    expect(fleschReadingEase("Comprehensive extended producer responsibility obligations necessitate meticulous documentation.")).toBeLessThan(20);
  });
  it("detects passive voice and transitions", () => {
    expect(passiveRatio("The return was filed. We filed it.")).toBe(0.5);
    expect(transitionRatio("However, it works. It works.")).toBe(0.5);
  });
});

describe("keyword helpers", () => {
  it("matches whole phrases case-insensitively", () => {
    expect(containsKeyword("Your EPR-compliance checklist", "EPR compliance")).toBe(true);
    expect(containsKeyword("EPRS compliance", "EPR compliance")).toBe(false);
    expect(keywordOccurrences("EPR compliance and epr compliance.", "EPR compliance")).toBe(2);
  });
});

describe("analyzeDoc", () => {
  it("collects links, images, headings and answers after question headings", () => {
    const a = analyzeDoc(richDoc);
    expect(a.links.filter((l) => l.internal)).toHaveLength(2);
    expect(a.links.filter((l) => !l.internal)).toHaveLength(1);
    expect(a.images).toHaveLength(1);
    expect(a.headings.map((x) => x.level)).toEqual([2, 2, 3]);
    expect(a.paragraphs.find((x) => x.afterHeading?.text === "What is EPR compliance?")?.words).toBeLessThanOrEqual(50);
  });
});

describe("scorePost", () => {
  it("scores a well-optimised post highly", () => {
    const r = scorePost(input());
    expect(r.seo.score).toBeGreaterThanOrEqual(80);
    expect(r.aeo.score).toBeGreaterThanOrEqual(80);
    expect(r.geo.score).toBeGreaterThanOrEqual(80);
    expect(r.checklist).toHaveLength(16);
    expect(r.checklist.find((c) => c.id === "kw-title")?.status).toBe("pass");
  });

  it("scores an empty post low with actionable fixes", () => {
    const r = scorePost(
      input({
        title: "Untitled",
        slug: "untitled",
        content: { type: "doc", content: [p(t("Short."))] },
        seo: { ...input().seo, focusKeyword: "", seoTitle: "", metaDescription: "" },
        ai: { ...input().ai, aiSummary: "", keyTakeaways: [], faqs: [], mainEntity: null, about: [], mentions: [] },
        featuredImage: { set: false, alt: "" },
        author: null,
      }),
    );
    expect(r.seo.score).toBeLessThan(30);
    expect(r.aeo.score).toBeLessThan(20);
    expect(r.geo.score).toBeLessThan(30);
    const meta = r.checklist.find((c) => c.id === "meta")!;
    expect(meta.status).toBe("fail");
    expect(meta.fix).toEqual({ tab: "seo", field: "meta-description" });
  });

  it("flags keyword stuffing", () => {
    const stuffed = { type: "doc", content: [p(t("EPR compliance EPR compliance EPR compliance about EPR compliance."))] } as PMNode;
    const r = scorePost(input({ content: stuffed }));
    expect(r.seo.checks.find((c) => c.id === "kw-density")?.status).toBe("fail");
  });

  it("uses word-count targets per content type", () => {
    expect(scorePost(input({ ai: { ...input().ai, contentType: "News" } })).wordCount).toMatchObject({ min: 400, max: 800 });
    expect(scorePost(input({ ai: { ...input().ai, contentType: "Guide" } })).wordCount.status).not.toBe("pass");
  });

  it("marks stale posts and broken links", () => {
    const r = scorePost(input({ modifiedAt: "2024-01-01T00:00:00Z", brokenLinks: 2, now: new Date("2026-10-01T00:00:00Z") }));
    expect(r.geo.checks.find((c) => c.id === "fresh")?.status).toBe("fail");
    expect(r.links.checks.find((c) => c.id === "links-broken")?.status).toBe("fail");
  });
});
