// Content scoring + publish checklist. Pure functions shared by the editor (live, debounced)
// and the server (authoritative scores saved on every save).
import { slugify } from "@/lib/slug";
import type { PMNode } from "@/lib/content/types";
import { analyzeDoc, type DocAnalysis } from "./analyze";
import { averageSentenceLength, fleschReadingEase, passiveRatio, transitionRatio } from "./readability";

export type Status = "pass" | "warn" | "fail";
export type FixTab = "content" | "publish" | "seo" | "ai" | "schema";
export type FixTarget = { tab: FixTab; field?: string };
export type Check = { id: string; label: string; status: Status; message: string; weight: number; fix?: FixTarget };
export type ScoreGroup = { score: number; checks: Check[] };
export type ChecklistItem = { id: string; label: string; status: Status; message: string; fix?: FixTarget };

export type ScoreInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: PMNode;
  seo: { seoTitle: string; metaDescription: string; focusKeyword: string; secondaryKeywords: string[]; canonicalUrl: string; breadcrumbEnabled: boolean };
  ai: {
    aiSummary: string;
    keyTakeaways: string[];
    faqs: { question: string; answer: string }[];
    mainEntity: { name: string; sameAs: string } | null;
    about: { name: string; sameAs: string }[];
    mentions: { name: string; sameAs: string }[];
    contentType: string;
  };
  schemaExtras: { howToStepCount: number; videoUrl: string; reviewItemName: string };
  featuredImage: { set: boolean; alt: string; sizeBytes?: number };
  author: { hasBio: boolean; hasCredentials: boolean; hasProfiles: boolean } | null;
  /** Public "Updated" date; null for posts that were never published. */
  modifiedAt: string | null;
  brokenLinks: number;
  now?: Date;
};

export type ScoreReport = {
  seo: ScoreGroup;
  aeo: ScoreGroup;
  geo: ScoreGroup;
  readability: ScoreGroup;
  schema: ScoreGroup;
  links: ScoreGroup;
  images: ScoreGroup;
  headings: ScoreGroup;
  wordCount: { count: number; min: number; max: number; status: Status; readingTime: number };
  checklist: ChecklistItem[];
  stats: { flesch: number; avgSentence: number; passive: number; transitions: number; density: number; internal: number; external: number; images: number };
};

// --- helpers ------------------------------------------------------------------------------------

const WORD_TARGETS: Record<string, [number, number]> = {
  Guide: [1500, 2500],
  HowTo: [1000, 2000],
  Listicle: [1200, 2500],
  News: [400, 800],
  Review: [1200, 2500],
  ProductReview: [1200, 2500],
  CaseStudy: [1000, 2000],
  Opinion: [800, 1500],
  Glossary: [600, 1200],
};

const AUTHORITY = /(\.gov\.in|\.nic\.in|\.gov(\.[a-z]{2})?|\.edu|\.ac\.in|cpcb|moef|mospi|niti\.gov|pib\.gov|un\.org|unep\.org|who\.int|worldbank\.org|oecd\.org|europa\.eu|wikipedia\.org)(\/|$|:)/i;
const QUESTION_HEADING = /\?\s*$|^(what|how|why|when|who|whom|which|where|can|is|are|do|does|should|will|would)\b/i;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export function containsKeyword(haystack: string, keyword: string): boolean {
  const k = norm(keyword);
  return Boolean(k) && ` ${norm(haystack)} `.includes(` ${k} `);
}

export function keywordOccurrences(text: string, keyword: string): number {
  const k = norm(keyword);
  if (!k) return 0;
  const hay = ` ${norm(text)} `;
  let count = 0;
  for (let i = hay.indexOf(` ${k} `); i !== -1; i = hay.indexOf(` ${k} `, i + k.length)) count++;
  return count;
}

const firstWords = (text: string, n: number) => text.split(/\s+/).slice(0, n).join(" ");
const ok = (cond: boolean, warn = false): Status => (cond ? "pass" : warn ? "warn" : "fail");
const between = (n: number, lo: number, hi: number) => n >= lo && n <= hi;

function group(checks: Check[]): ScoreGroup {
  const total = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return { score: total ? Math.round((got / total) * 100) : 0, checks };
}

// --- scoring ------------------------------------------------------------------------------------

export function scorePost(input: ScoreInput, analysis: DocAnalysis = analyzeDoc(input.content, input.ai)): ScoreReport {
  const now = input.now ?? new Date();
  const a = analysis;
  const kw = input.seo.focusKeyword.trim();
  const seoTitle = input.seo.seoTitle || input.title;
  const meta = input.seo.metaDescription.trim();
  const h2s = a.headings.filter((h) => h.level === 2);
  const internal = a.links.filter((l) => l.internal);
  const external = a.links.filter((l) => !l.internal);
  const authority = external.filter((l) => AUTHORITY.test(l.href));
  const allImages = [...a.images, ...(input.featuredImage.set ? [{ alt: input.featuredImage.alt, src: "featured" }] : [])];
  const missingAlt = allImages.filter((i) => !i.alt).length;
  const occurrences = kw ? keywordOccurrences(a.text, kw) : 0;
  const density = a.wordCount ? Math.round((occurrences / a.wordCount) * 1000) / 10 : 0;
  const slugKw = slugify(kw);
  const kwInSlug = Boolean(slugKw) && (input.slug.includes(slugKw) || slugKw.split("-").every((w) => input.slug.split("-").includes(w)));
  const noKw = (label: string): Check => ({ id: "", label, status: "fail", message: "Set a focus keyword first.", weight: 0, fix: { tab: "seo", field: "focus-kw" } });

  // SEO ------------------------------------------------------------------------------------------
  const seoChecks: Check[] = [
    { id: "kw-set", label: "Focus keyword set", status: ok(Boolean(kw)), message: kw ? `“${kw}”` : "Choose the main search phrase this post should rank for.", weight: 2, fix: { tab: "seo", field: "focus-kw" } },
    kw
      ? { id: "kw-title", label: "Keyword in SEO title", status: ok(containsKeyword(seoTitle, kw)), message: containsKeyword(seoTitle, kw) ? "Found." : "Add the keyword to the SEO title, ideally near the start.", weight: 3, fix: { tab: "seo", field: "seo-title" } }
      : { ...noKw("Keyword in SEO title"), id: "kw-title", weight: 3 },
    kw
      ? { id: "kw-slug", label: "Keyword in URL", status: ok(kwInSlug), message: kwInSlug ? "Found." : "Include the keyword's words in the slug.", weight: 2, fix: { tab: "content", field: "post-slug" } }
      : { ...noKw("Keyword in URL"), id: "kw-slug", weight: 2 },
    kw
      ? { id: "kw-h1", label: "Keyword in H1 (title)", status: ok(containsKeyword(input.title, kw)), message: containsKeyword(input.title, kw) ? "Found." : "Use the keyword in the post title.", weight: 2, fix: { tab: "content", field: "post-title" } }
      : { ...noKw("Keyword in H1"), id: "kw-h1", weight: 2 },
    kw
      ? {
          id: "kw-intro",
          label: "Keyword in first 100 words",
          status: ok(containsKeyword(firstWords(a.text, 100), kw)),
          message: containsKeyword(firstWords(a.text, 100), kw) ? "Found." : "Mention the keyword early in the introduction.",
          weight: 2,
          fix: { tab: "content" },
        }
      : { ...noKw("Keyword in first 100 words"), id: "kw-intro", weight: 2 },
    kw
      ? { id: "kw-meta", label: "Keyword in meta description", status: ok(containsKeyword(meta, kw)), message: containsKeyword(meta, kw) ? "Found." : "Use the keyword in the meta description.", weight: 2, fix: { tab: "seo", field: "meta-description" } }
      : { ...noKw("Keyword in meta description"), id: "kw-meta", weight: 2 },
    kw
      ? {
          id: "kw-h2",
          label: "Keyword in an H2",
          status: ok(h2s.some((h) => containsKeyword(h.text, kw)), true),
          message: h2s.some((h) => containsKeyword(h.text, kw)) ? "Found." : "Use the keyword (or a close variant) in at least one H2.",
          weight: 1,
          fix: { tab: "content" },
        }
      : { ...noKw("Keyword in an H2"), id: "kw-h2", weight: 1 },
    kw
      ? {
          id: "kw-alt",
          label: "Keyword in an image alt",
          status: ok(allImages.some((i) => containsKeyword(i.alt, kw)), true),
          message: allImages.length ? (allImages.some((i) => containsKeyword(i.alt, kw)) ? "Found." : "Describe at least one image using the keyword, where it fits naturally.") : "No images yet.",
          weight: 1,
          fix: { tab: "content" },
        }
      : { ...noKw("Keyword in an image alt"), id: "kw-alt", weight: 1 },
    kw
      ? {
          id: "kw-density",
          label: "Keyword density 0.5–2.5%",
          status: between(density, 0.5, 2.5) ? "pass" : density > 2.5 ? "fail" : "warn",
          message: `${density}% (${occurrences}×). ${density > 2.5 ? "Too high; it reads as stuffing." : density < 0.5 ? "Use the keyword a little more." : "Good."}`,
          weight: 1,
          fix: { tab: "content" },
        }
      : { ...noKw("Keyword density"), id: "kw-density", weight: 1 },
    {
      id: "title-length",
      label: "SEO title 30–60 characters",
      status: between(seoTitle.length, 30, 60) ? "pass" : between(seoTitle.length, 20, 70) ? "warn" : "fail",
      message: `${seoTitle.length} characters.`,
      weight: 2,
      fix: { tab: "seo", field: "seo-title" },
    },
    {
      id: "meta-length",
      label: "Meta description 120–155 characters",
      status: between(meta.length, 120, 155) ? "pass" : between(meta.length, 70, 170) ? "warn" : "fail",
      message: meta ? `${meta.length} characters.` : "Missing.",
      weight: 2,
      fix: { tab: "seo", field: "meta-description" },
    },
    {
      id: "slug-length",
      label: "Short URL",
      status: input.slug.length <= 60 && input.slug.split("-").length <= 8 ? "pass" : input.slug.length <= 80 ? "warn" : "fail",
      message: `${input.slug.length} characters, ${input.slug.split("-").filter(Boolean).length} words.`,
      weight: 1,
      fix: { tab: "content", field: "post-slug" },
    },
    { id: "internal", label: "Internal links (2+)", status: internal.length >= 2 ? "pass" : internal.length === 1 ? "warn" : "fail", message: `${internal.length} internal link(s).`, weight: 2, fix: { tab: "content" } },
    { id: "external", label: "External links (1+)", status: ok(external.length >= 1), message: `${external.length} external link(s).`, weight: 1, fix: { tab: "content" } },
    {
      id: "alts",
      label: "All images have alt text",
      status: missingAlt === 0 ? "pass" : "fail",
      message: allImages.length ? (missingAlt ? `${missingAlt} image(s) missing alt text.` : `${allImages.length} image(s), all described.`) : "No images.",
      weight: 2,
      fix: { tab: missingAlt && !input.featuredImage.alt && input.featuredImage.set ? "publish" : "content" },
    },
  ];

  // AEO ------------------------------------------------------------------------------------------
  const summaryLen = input.ai.aiSummary.trim().length;
  const faqCount = input.ai.faqs.filter((f) => f.question.trim() && f.answer.trim()).length;
  const qHeadings = a.headings.filter((h) => h.level <= 3 && QUESTION_HEADING.test(h.text));
  const qAnswers = a.paragraphs.filter((p) => p.afterHeading && QUESTION_HEADING.test(p.afterHeading.text));
  const directAnswers = qAnswers.filter((p) => p.words <= 50).length;
  const takeaways = input.ai.keyTakeaways.filter((t) => t.trim()).length;
  const aeoChecks: Check[] = [
    {
      id: "summary",
      label: "AI summary 200–300 characters",
      status: between(summaryLen, 200, 300) ? "pass" : summaryLen >= 120 ? "warn" : "fail",
      message: summaryLen ? `${summaryLen} characters.` : "Missing: write a direct answer to the post's main question.",
      weight: 3,
      fix: { tab: "ai", field: "ai-summary" },
    },
    { id: "faqs", label: "3+ FAQs", status: faqCount >= 3 ? "pass" : faqCount > 0 ? "warn" : "fail", message: `${faqCount} FAQ(s).`, weight: 2, fix: { tab: "ai", field: "ai-faqs" } },
    {
      id: "question-headings",
      label: "Question-style H2/H3s",
      status: qHeadings.length >= 2 ? "pass" : qHeadings.length === 1 ? "warn" : "fail",
      message: qHeadings.length ? `${qHeadings.length} heading(s) phrased as questions.` : "Phrase some headings as the questions readers ask (What is…? How do…?).",
      weight: 2,
      fix: { tab: "content" },
    },
    {
      id: "direct-answers",
      label: "Short direct answers after questions",
      status: !qAnswers.length ? "fail" : directAnswers === qAnswers.length ? "pass" : directAnswers ? "warn" : "fail",
      message: qAnswers.length ? `${directAnswers} of ${qAnswers.length} question sections open with an answer of 50 words or fewer.` : "No question headings with an answer paragraph yet.",
      weight: 2,
      fix: { tab: "content" },
    },
    { id: "lists", label: "Lists or tables", status: ok(a.hasList || a.hasTable), message: a.hasList || a.hasTable ? "Present." : "Add a list or table; answer engines lift structured content.", weight: 1, fix: { tab: "content" } },
    { id: "takeaways", label: "Key takeaways (3–7)", status: between(takeaways, 3, 7) ? "pass" : takeaways ? "warn" : "fail", message: `${takeaways} takeaway(s).`, weight: 2, fix: { tab: "ai", field: "ai-takeaways" } },
  ];

  // GEO ------------------------------------------------------------------------------------------
  const entities = [input.ai.mainEntity, ...input.ai.about, ...input.ai.mentions].filter((e): e is NonNullable<typeof e> => Boolean(e?.name));
  const withSameAs = entities.filter((e) => e.sameAs).length;
  const stats = a.text.match(/(?:₹|rs\.?\s?)\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:%|percent|per cent|crore|lakh|tonnes?|tons?|mt|kg|million|billion)\b/gi)?.length ?? 0;
  const definitions = a.paragraphs.slice(0, 4).some((p) => /\b(is|are|refers to|means)\s+(a|an|the)\b/i.test(p.text)) || a.headings.some((h) => /^what (is|are)\b/i.test(h.text));
  const ageDays = input.modifiedAt ? (now.getTime() - new Date(input.modifiedAt).getTime()) / 86_400_000 : 0;
  const geoChecks: Check[] = [
    { id: "main-entity", label: "Main entity set", status: ok(Boolean(input.ai.mainEntity?.name)), message: input.ai.mainEntity?.name ? input.ai.mainEntity.name : "Name the main thing this page is about.", weight: 2, fix: { tab: "ai", field: "ai-entities" } },
    {
      id: "entities",
      label: "Entities linked to Wikipedia/Wikidata",
      status: withSameAs >= 3 ? "pass" : withSameAs ? "warn" : "fail",
      message: `${entities.length} entities, ${withSameAs} with a sameAs link.`,
      weight: 2,
      fix: { tab: "ai", field: "ai-entities" },
    },
    {
      id: "stats",
      label: "Statistics with cited sources",
      status: stats >= 2 && external.length ? "pass" : stats ? "warn" : "fail",
      message: `${stats} figure(s), ${external.length} external source link(s).`,
      weight: 2,
      fix: { tab: "content" },
    },
    { id: "expert", label: "Expert quote", status: ok(a.expertQuotes > 0, true), message: a.expertQuotes ? "Present." : "Quote a named expert with their role.", weight: 1, fix: { tab: "content" } },
    {
      id: "authority",
      label: "Authority sources (.gov.in, CPCB, MoEFCC…)",
      status: authority.length ? "pass" : "fail",
      message: authority.length ? `${authority.length} authority link(s).` : "Link to the primary source: CPCB, MoEFCC, the Gazette notification…",
      weight: 2,
      fix: { tab: "content" },
    },
    {
      id: "author",
      label: "Author with credentials",
      status: !input.author ? "fail" : input.author.hasCredentials && input.author.hasBio ? "pass" : input.author.hasBio || input.author.hasCredentials ? "warn" : "fail",
      message: !input.author ? "No author." : input.author.hasCredentials && input.author.hasBio ? "Bio and credentials set." : "Complete the author's bio and credentials (Authors).",
      weight: 2,
      fix: { tab: "publish" },
    },
    {
      id: "fresh",
      label: "Recently updated",
      status: !input.modifiedAt || ageDays <= 365 ? "pass" : ageDays <= 540 ? "warn" : "fail",
      message: !input.modifiedAt ? "New post." : `Last significant update ${Math.round(ageDays)} days ago.`,
      weight: 1,
      fix: { tab: "publish" },
    },
    { id: "definitions", label: "Clear definitions", status: ok(definitions, true), message: definitions ? "The post defines its subject." : "Define the topic early (“EPR is a…”), or add a “What is…?” section.", weight: 1, fix: { tab: "content" } },
  ];

  // Readability ------------------------------------------------------------------------------------
  const flesch = fleschReadingEase(a.text);
  const avgSentence = averageSentenceLength(a.text);
  const passive = passiveRatio(a.text);
  const transitions = transitionRatio(a.text);
  const longParas = a.paragraphs.filter((p) => p.words > 150).length;
  const longestSection = Math.max(0, ...a.sectionWordCounts);
  const readChecks: Check[] = (
    [
    {
      id: "flesch",
      label: "Flesch reading ease",
      status: flesch >= 50 ? "pass" : flesch >= 30 ? "warn" : "fail",
      message: `${flesch}. ${flesch >= 60 ? "Easy to read." : flesch >= 50 ? "Fairly easy." : flesch >= 30 ? "Difficult; shorten sentences and words." : "Very difficult."} Technical topics usually land at 40–60.`,
      weight: 2,
    },
    { id: "sentence-length", label: "Average sentence ≤ 20 words", status: avgSentence <= 20 ? "pass" : avgSentence <= 25 ? "warn" : "fail", message: `${avgSentence} words per sentence.`, weight: 2 },
    { id: "long-paragraphs", label: "No paragraphs over 150 words", status: longParas === 0 ? "pass" : longParas <= 2 ? "warn" : "fail", message: `${longParas} long paragraph(s).`, weight: 1 },
    { id: "passive", label: "Passive voice ≤ 10%", status: passive <= 0.1 ? "pass" : passive <= 0.2 ? "warn" : "fail", message: `${Math.round(passive * 100)}% of sentences.`, weight: 1 },
    { id: "transitions", label: "Transition words in 20%+ of sentences", status: transitions >= 0.2 ? "pass" : transitions >= 0.1 ? "warn" : "fail", message: `${Math.round(transitions * 100)}% of sentences.`, weight: 1 },
    {
      id: "subheadings",
      label: "A subheading every ~300 words",
      status: longestSection <= 350 ? "pass" : longestSection <= 500 ? "warn" : "fail",
      message: `Longest stretch without a heading: ${longestSection} words.`,
      weight: 1,
    },
    ] satisfies Omit<Check, "fix">[]
  ).map((c) => ({ ...c, fix: { tab: "content" as const } }));

  // Schema / links / images / headings ---------------------------------------------------------------
  const isReview = input.ai.contentType === "Review" || input.ai.contentType === "ProductReview";
  const schemaChecks: Check[] = [
    { id: "schema-headline", label: "Headline", status: ok(Boolean(input.title.trim())), message: input.title.trim() ? "Set." : "Add a title.", weight: 2, fix: { tab: "content", field: "post-title" } },
    { id: "schema-image", label: "Article image", status: ok(input.featuredImage.set), message: input.featuredImage.set ? "Featured image set." : "Add a featured image (BlogPosting requires an image).", weight: 2, fix: { tab: "publish", field: "featured-image" } },
    { id: "schema-author", label: "Author", status: ok(Boolean(input.author)), message: input.author ? "Set." : "Choose an author.", weight: 2, fix: { tab: "publish" } },
    ...(input.ai.contentType === "HowTo"
      ? [{ id: "schema-howto", label: "HowTo steps", status: ok(input.schemaExtras.howToStepCount >= 2) as Status, message: `${input.schemaExtras.howToStepCount} step(s).`, weight: 1, fix: { tab: "schema" as const } }]
      : []),
    ...(isReview
      ? [{ id: "schema-review", label: "Reviewed item", status: ok(Boolean(input.schemaExtras.reviewItemName)) as Status, message: input.schemaExtras.reviewItemName || "Name the item being reviewed.", weight: 1, fix: { tab: "schema" as const } }]
      : []),
    ...(input.schemaExtras.videoUrl
      ? [{ id: "schema-video", label: "Video details match an embedded video", status: ok(a.videos > 0) as Status, message: a.videos ? "Embedded." : "Embed the video in the content, or remove the video details.", weight: 1, fix: { tab: "schema" as const } }]
      : []),
  ];
  const linkChecks: Check[] = [
    { id: "links-internal", label: "Internal links", status: internal.length >= 2 ? "pass" : internal.length ? "warn" : "fail", message: `${internal.length}`, weight: 1, fix: { tab: "content" } },
    { id: "links-external", label: "External links", status: ok(external.length >= 1), message: `${external.length}`, weight: 1, fix: { tab: "content" } },
    { id: "links-broken", label: "Broken links", status: input.brokenLinks ? "fail" : "pass", message: input.brokenLinks ? `${input.brokenLinks} broken (see SEO Tools → Broken Links).` : "None found in the last scan.", weight: 1, fix: { tab: "content" } },
  ];
  const imageChecks: Check[] = [
    { id: "img-featured", label: "Featured image", status: ok(input.featuredImage.set), message: input.featuredImage.set ? "Set." : "Missing.", weight: 2, fix: { tab: "publish", field: "featured-image" } },
    { id: "img-alt", label: "Alt text coverage", status: missingAlt ? "fail" : "pass", message: `${allImages.length - missingAlt}/${allImages.length} described.`, weight: 2, fix: { tab: "content" } },
    { id: "img-count", label: "Images in content", status: a.images.length ? "pass" : a.wordCount > 800 ? "warn" : "pass", message: `${a.images.length} image(s).`, weight: 1, fix: { tab: "content" } },
    ...(input.featuredImage.sizeBytes && input.featuredImage.sizeBytes > 5 * 1024 * 1024
      ? [{ id: "img-size", label: "Featured image file size", status: "warn" as Status, message: "The original is over 5 MB. Visitors get optimised AVIF/WebP versions, but a smaller upload is faster to process.", weight: 1, fix: { tab: "publish" as const } }]
      : []),
  ];
  const skipped = a.headingLevels.some((lvl, i) => lvl - (i === 0 ? 1 : a.headingLevels[i - 1]) > 1);
  const headingChecks: Check[] = [
    { id: "h1", label: "Single H1 (the title)", status: ok(Boolean(input.title.trim())), message: "The editor allows no H1 in the content, so the title is the only one.", weight: 1, fix: { tab: "content", field: "post-title" } },
    { id: "h-skip", label: "No skipped heading levels", status: skipped ? "warn" : "pass", message: skipped ? "A heading jumps a level (e.g. H2 → H4)." : "Heading levels are in order.", weight: 1, fix: { tab: "content" } },
    { id: "h2-count", label: "H2 sections", status: h2s.length >= 2 ? "pass" : h2s.length ? "warn" : "fail", message: `${h2s.length} H2(s).`, weight: 1, fix: { tab: "content" } },
  ];

  const [min, max] = WORD_TARGETS[input.ai.contentType] ?? WORD_TARGETS.Guide;
  const wordStatus: Status = a.wordCount >= min && a.wordCount <= max * 1.5 ? "pass" : a.wordCount >= min * 0.7 ? "warn" : "fail";
  const readingTime = a.wordCount ? Math.max(1, Math.round(a.wordCount / 220)) : 0;

  const report: Omit<ScoreReport, "checklist"> = {
    seo: group(seoChecks),
    aeo: group(aeoChecks),
    geo: group(geoChecks),
    readability: group(readChecks),
    schema: group(schemaChecks),
    links: group(linkChecks),
    images: group(imageChecks),
    headings: group(headingChecks),
    wordCount: { count: a.wordCount, min, max, status: wordStatus, readingTime },
    stats: { flesch, avgSentence, passive, transitions, density, internal: internal.length, external: external.length, images: allImages.length },
  };

  // Publish checklist -------------------------------------------------------------------------------
  const find = (g: ScoreGroup, id: string) => g.checks.find((c) => c.id === id)!;
  const fromCheck = (c: Check, label: string): ChecklistItem => ({ id: c.id, label, status: c.status, message: c.message, fix: c.fix });
  const canonicalOk = !input.seo.canonicalUrl || /^https?:\/\/\S+$/.test(input.seo.canonicalUrl);
  const schemaErrors = report.schema.checks.filter((c) => c.status === "fail");
  const checklist: ChecklistItem[] = [
    fromCheck(find(report.seo, "kw-title"), "Focus keyword in SEO title"),
    fromCheck(find(report.seo, "kw-slug"), "Focus keyword in URL slug"),
    fromCheck(find(report.seo, "kw-h1"), "Focus keyword in H1"),
    {
      id: "meta",
      label: "Meta description present (and within length)",
      status: !meta ? "fail" : between(meta.length, 120, 155) ? "pass" : "warn",
      message: meta ? `${meta.length} characters.` : "Missing.",
      fix: { tab: "seo", field: "meta-description" },
    },
    fromCheck(find(report.seo, "alts"), "All images have ALT text"),
    { ...fromCheck(find(report.seo, "internal"), "Internal links added (≥2)") },
    fromCheck(find(report.geo, "authority"), "External authority links added (≥1)"),
    { id: "faq", label: "FAQ section added", status: faqCount ? "pass" : "fail", message: `${faqCount} FAQ(s).`, fix: { tab: "ai", field: "ai-faqs" } },
    {
      id: "schema",
      label: "Schema valid",
      status: schemaErrors.length ? "fail" : "pass",
      message: schemaErrors.length ? schemaErrors.map((c) => c.message).join(" ") : "Required properties present. Run Schema → Validate for the full check.",
      fix: { tab: "schema" },
    },
    { id: "canonical", label: "Canonical URL set", status: canonicalOk ? "pass" : "fail", message: input.seo.canonicalUrl ? input.seo.canonicalUrl : "Self-referencing (default).", fix: { tab: "seo", field: "canonical" } },
    { id: "breadcrumb", label: "Breadcrumb enabled", status: input.seo.breadcrumbEnabled ? "pass" : "warn", message: input.seo.breadcrumbEnabled ? "On." : "Off.", fix: { tab: "seo" } },
    { id: "ai-summary", label: "AI Summary added", status: summaryLen ? (between(summaryLen, 200, 300) ? "pass" : "warn") : "fail", message: summaryLen ? `${summaryLen} characters.` : "Missing.", fix: { tab: "ai", field: "ai-summary" } },
    { id: "takeaways", label: "Key Takeaways added", status: takeaways ? (between(takeaways, 3, 7) ? "pass" : "warn") : "fail", message: `${takeaways} takeaway(s).`, fix: { tab: "ai", field: "ai-takeaways" } },
    {
      id: "toc",
      label: "Table of Contents generated (≥3 headings)",
      status: a.headings.length >= 3 ? "pass" : "fail",
      message: `${a.headings.length} heading(s).`,
      fix: { tab: "content" },
    },
    { id: "reading-time", label: "Reading time available", status: readingTime ? "pass" : "fail", message: readingTime ? `${readingTime} min.` : "No content yet.", fix: { tab: "content" } },
    {
      id: "word-count",
      label: "Word count within the recommended range",
      status: wordStatus,
      message: `${a.wordCount} words; ${input.ai.contentType} target ${min}–${max}.`,
      fix: { tab: "content" },
    },
  ];

  return { ...report, checklist };
}

/** Compact form saved on the post (scores + checklist statuses). */
export function scoreSummary(r: ScoreReport) {
  return {
    seo: r.seo.score,
    aeo: r.aeo.score,
    geo: r.geo.score,
    readability: r.readability.score,
    checklist: r.checklist.map((c) => ({ id: c.id, label: c.label, status: c.status })),
  };
}
