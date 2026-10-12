import { describe, expect, it } from "vitest";
import { buildListingSchema, buildSchema, validateSchema } from "@/lib/seo/schema";
import { serializeJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_SETTINGS } from "@/lib/cms/defaults";
import type { PublicAuthor, PublicPost } from "@/lib/data/blog";
import type { MediaItem } from "@/lib/media/types";

const image: MediaItem = {
  id: "m1",
  url: "https://cdn.example.com/hero.png",
  mimeType: "image/png",
  width: 1600,
  height: 840,
  variants: { original: [{ width: 1280, key: "k", url: "https://cdn.example.com/hero-1280.png", size: 1 }] },
  blurDataURL: "",
  alt: "Hero",
  originalName: "hero.png",
  title: "",
  caption: "",
  description: "",
  sizeBytes: 1,
  storageDriver: "s3",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const author: PublicAuthor = {
  id: "a1",
  name: "Asha Verma",
  slug: "asha-verma",
  bio: "EPR consultant.",
  jobTitle: "Compliance Lead",
  credentials: "M.Tech Environmental Engineering",
  expertise: ["EPR"],
  sameAs: ["https://www.linkedin.com/in/example"],
  avatar: null,
};

function makePost(over: Partial<PublicPost> = {}): PublicPost {
  const base: PublicPost = {
    id: "p1",
    slug: "epr-guide",
    title: "EPR Guide",
    excerpt: "Excerpt",
    publishedAt: "2026-01-02T00:00:00.000Z",
    modifiedAt: "2026-02-03T00:00:00.000Z",
    readingTimeMinutes: 7,
    category: { name: "EPR Compliance", slug: "epr-compliance" },
    authorName: author.name,
    image,
    imageAlt: "Hero alt",
    robotsIndex: true,
    contentHtml: "",
    contentText: "",
    wordCount: 1500,
    lastReviewedAt: "2026-02-01T00:00:00.000Z",
    toc: [],
    headingCount: 4,
    blocks: { faq: false, takeaways: false, toc: false },
    imageCaption: "",
    imageTitle: "",
    tags: [{ name: "CPCB", slug: "cpcb" }],
    author,
    reviewer: null,
    seo: {
      seoTitle: "EPR Guide for PIBOs",
      metaDescription: "Meta",
      focusKeyword: "EPR compliance",
      secondaryKeywords: ["EPR registration"],
      canonicalUrl: "",
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: "",
      ogDescription: "",
      ogImage: null,
      twitterCard: "summary_large_image",
      twitterTitle: "",
      twitterDescription: "",
      breadcrumbEnabled: true,
      customMetaTags: [],
    },
    ai: {
      aiSummary: "Register, calculate, fulfil, file.",
      keyTakeaways: ["One"],
      faqs: [],
      mainEntity: { name: "Extended producer responsibility", type: "Thing", sameAs: "https://en.wikipedia.org/wiki/Extended_producer_responsibility" },
      about: [],
      mentions: [{ name: "CPCB", type: "GovernmentOrganization", sameAs: "https://en.wikipedia.org/wiki/Central_Pollution_Control_Board" }],
      targetLanguage: "en-IN",
      contentType: "Guide",
    },
    schemaExtras: { howToSteps: [], video: null, review: null, product: null, speakableEnabled: true },
    contentImages: [],
    contentVideos: [],
  };
  return { ...base, ...over };
}

const types = (g: ReturnType<typeof buildSchema>) => g["@graph"].map((n) => n["@type"]);
const node = (g: ReturnType<typeof buildSchema>, type: string) => g["@graph"].find((n) => n["@type"] === type)!;

describe("buildSchema", () => {
  it("Guide: core graph with linked ids", () => {
    const g = buildSchema(makePost(), DEFAULT_SETTINGS);
    expect(types(g)).toEqual([
      ["Organization", "LocalBusiness", "RecyclingCenter"],
      "WebSite",
      "ImageObject",
      "Person",
      "BreadcrumbList",
      "WebPage",
      "BlogPosting",
    ]);
    const article = node(g, "BlogPosting");
    expect(article.author).toEqual({ "@id": "https://evergreen.example/blog/author/asha-verma#person" });
    expect(article.publisher).toEqual({ "@id": "https://evergreen.example/#organization" });
    expect(article.mainEntityOfPage).toEqual({ "@id": "https://evergreen.example/blog/epr-guide#webpage" });
    expect(article.abstract).toBe("Register, calculate, fulfil, file.");
    expect(node(g, "WebPage").speakable).toEqual({ "@type": "SpeakableSpecification", cssSelector: [".article-title", ".ai-summary", ".key-takeaways"] });
    expect(g).toMatchSnapshot();
  });

  it("FAQPage only when FAQs exist", () => {
    expect(types(buildSchema(makePost(), DEFAULT_SETTINGS))).not.toContain("FAQPage");
    const g = buildSchema(makePost({ ai: { ...makePost().ai, faqs: [{ question: "Q?", answer: "A." }] } }), DEFAULT_SETTINGS);
    expect(node(g, "FAQPage").mainEntity).toEqual([{ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } }]);
  });

  it("HowTo: emitted with steps, warned without", () => {
    const howto = makePost({
      ai: { ...makePost().ai, contentType: "HowTo" },
      schemaExtras: { ...makePost().schemaExtras, howToSteps: [{ name: "Register", text: "On the portal", image: null }, { name: "File", text: "Annual return", image: null }] },
    });
    const g = buildSchema(howto, DEFAULT_SETTINGS);
    expect((node(g, "HowTo").step as unknown[]).length).toBe(2);
    expect(g).toMatchSnapshot();
    const noSteps = makePost({ ai: { ...makePost().ai, contentType: "HowTo" } });
    const issues = validateSchema(buildSchema(noSteps, DEFAULT_SETTINGS), noSteps);
    expect(issues.some((i) => i.type === "HowTo")).toBe(true);
  });

  it("VideoObject only for embedded videos, enriched by matching details", () => {
    const details = { url: "https://youtu.be/0eKVizvYSUQ", embedUrl: "", name: "How Search Works", description: "Overview", thumbnail: null, uploadDate: "2020-01-01T00:00:00.000Z", duration: "PT5M" };
    const embedded = makePost({ contentVideos: [{ youtubeId: "0eKVizvYSUQ", title: "Video" }], schemaExtras: { ...makePost().schemaExtras, video: details } });
    const g = buildSchema(embedded, DEFAULT_SETTINGS);
    expect(node(g, "VideoObject")).toMatchObject({ name: "How Search Works", uploadDate: "2020-01-01T00:00:00.000Z", duration: "PT5M" });
    expect(validateSchema(g, embedded).filter((i) => i.level === "error")).toEqual([]);

    const notEmbedded = makePost({ schemaExtras: { ...makePost().schemaExtras, video: details } });
    const g2 = buildSchema(notEmbedded, DEFAULT_SETTINGS);
    expect(types(g2)).not.toContain("VideoObject");
    expect(validateSchema(g2, notEmbedded).some((i) => i.type === "VideoObject")).toBe(true);
  });

  it("Review never invents a rating; ProductReview links a Product", () => {
    const review = { itemName: "Portal", itemType: "SoftwareApplication", ratingValue: null, bestRating: 5, pros: ["Fast"], cons: ["Clunky"] };
    const g = buildSchema(makePost({ ai: { ...makePost().ai, contentType: "Review" }, schemaExtras: { ...makePost().schemaExtras, review } }), DEFAULT_SETTINGS);
    expect(node(g, "Review").reviewRating).toBeUndefined();
    expect(JSON.stringify(g)).not.toContain("AggregateRating");
    expect(g).toMatchSnapshot();

    const pr = buildSchema(
      makePost({
        ai: { ...makePost().ai, contentType: "ProductReview" },
        schemaExtras: { ...makePost().schemaExtras, review: { ...review, ratingValue: 4.5 }, product: { name: "Shredder X", brand: "Acme", sku: "SX1", priceRange: "₹₹" } },
      }),
      DEFAULT_SETTINGS,
    );
    expect(node(pr, "Product").review).toEqual({ "@id": "https://evergreen.example/blog/epr-guide#review" });
    expect(node(pr, "Review").reviewRating).toMatchObject({ ratingValue: 4.5, bestRating: 5 });
    expect(pr).toMatchSnapshot();
  });

  it("reviewer becomes a second Person and WebPage.reviewedBy", () => {
    const reviewer = { ...author, id: "a2", name: "Dr. Rao", slug: "dr-rao" };
    const g = buildSchema(makePost({ reviewer }), DEFAULT_SETTINGS);
    expect(g["@graph"].filter((n) => n["@type"] === "Person")).toHaveLength(2);
    expect(node(g, "WebPage").reviewedBy).toEqual({ "@id": "https://evergreen.example/blog/author/dr-rao#person" });
  });

  it("omits breadcrumb and speakable when disabled", () => {
    const p = makePost({ seo: { ...makePost().seo, breadcrumbEnabled: false }, schemaExtras: { ...makePost().schemaExtras, speakableEnabled: false } });
    const g = buildSchema(p, DEFAULT_SETTINGS);
    expect(types(g)).not.toContain("BreadcrumbList");
    expect(node(g, "WebPage").speakable).toBeUndefined();
  });

  it("serialises safely inside <script>", () => {
    const g = buildSchema(makePost({ title: "</script><script>alert(1)</script>" }), DEFAULT_SETTINGS);
    expect(serializeJsonLd(g)).not.toContain("</script>");
  });

  it("listing pages use CollectionPage / ProfilePage", () => {
    const coll = buildListingSchema({ settings: DEFAULT_SETTINGS, path: "/blog", name: "Blog", description: "", crumbs: [{ name: "Home", path: "/" }], posts: [{ slug: "a", title: "A" }] });
    expect(coll["@graph"].some((n) => n["@type"] === "CollectionPage")).toBe(true);
    const prof = buildListingSchema({ settings: DEFAULT_SETTINGS, path: "/blog/author/asha-verma", name: "Asha", description: "", crumbs: [], posts: [], author });
    expect(prof["@graph"].some((n) => n["@type"] === "ProfilePage")).toBe(true);
  });
});
