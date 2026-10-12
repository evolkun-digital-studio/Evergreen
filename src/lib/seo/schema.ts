// JSON-LD for articles: one @graph with linked @ids. Pure (no I/O), so it is unit-tested with
// snapshots and reused by the editor's Schema tab preview.
//
// Rules: only describe content that is visible on the page; never invent ratings (no
// AggregateRating is ever produced); omit empty properties.

import { SITE_URL } from "@/lib/cms/constants";
import type { SiteSettingsData } from "@/lib/cms/defaults";
import type { PublicAuthor, PublicPost } from "@/lib/data/blog";
import { ORGANIZATION_ID, WEBSITE_ID, organizationNode, websiteNode } from "./jsonld";
import { absoluteUrl, postOgImage, postUrl, socialImage } from "./metadata";

type Node = Record<string, unknown>;
type SchemaGraph = { "@context": "https://schema.org"; "@graph": Node[] };

const compact = (obj: Node): Node =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)),
  );

const ref = (id: string) => ({ "@id": id });
const personId = (a: Pick<PublicAuthor, "slug">) => `${SITE_URL}/blog/author/${a.slug}#person`;

function personNode(a: PublicAuthor): Node {
  const avatar = socialImage(a.avatar);
  return compact({
    "@type": "Person",
    "@id": personId(a),
    name: a.name,
    url: `${SITE_URL}/blog/author/${a.slug}`,
    image: avatar ? { "@type": "ImageObject", url: avatar.url, width: avatar.width, height: avatar.height } : undefined,
    jobTitle: a.jobTitle,
    description: a.bio,
    knowsAbout: a.expertise,
    hasCredential: a.credentials ? { "@type": "EducationalOccupationalCredential", name: a.credentials } : undefined,
    sameAs: a.sameAs,
    worksFor: ref(ORGANIZATION_ID),
  });
}

function entity(e: { name: string; type: string; sameAs: string }): Node {
  return compact({ "@type": e.type || "Thing", name: e.name, sameAs: e.sameAs });
}

/** Speakable targets that are actually rendered for this post. */
function speakableSelectors(post: PublicPost): string[] {
  return [
    ".article-title",
    ...(post.ai.aiSummary ? [".ai-summary"] : []),
    ...(post.ai.keyTakeaways.some((t) => t.trim()) ? [".key-takeaways"] : []),
  ];
}

export function buildSchema(post: PublicPost, settings: SiteSettingsData): SchemaGraph {
  const url = postUrl(post.slug);
  const ids = {
    webpage: `${url}#webpage`,
    article: `${url}#article`,
    breadcrumb: `${url}#breadcrumb`,
    image: `${url}#primaryimage`,
    faq: `${url}#faq`,
    howto: `${url}#howto`,
    review: `${url}#review`,
    product: `${url}#product`,
  };
  const lang = post.ai.targetLanguage || "en-IN";
  const description = post.seo.metaDescription || post.excerpt || post.ai.aiSummary;
  const graph: Node[] = [organizationNode(settings), websiteNode()];

  // --- images ---------------------------------------------------------------------------------
  const primary = socialImage(post.image) ?? postOgImage(post, settings);
  graph.push(
    compact({
      "@type": "ImageObject",
      "@id": ids.image,
      url: primary.url,
      contentUrl: primary.url,
      width: primary.width,
      height: primary.height,
      caption: post.image ? post.imageCaption || post.imageAlt : undefined,
      inLanguage: lang,
    }),
  );
  const contentImages = post.contentImages
    .filter((i) => i.src && !/\.svg($|\?)/i.test(i.src))
    .map((i) =>
      compact({ "@type": "ImageObject", url: absoluteUrl(i.src), contentUrl: absoluteUrl(i.src), width: i.width || undefined, height: i.height || undefined, caption: i.caption || i.alt }),
    );

  // --- people ---------------------------------------------------------------------------------
  graph.push(personNode(post.author));
  const reviewer = post.reviewer && post.reviewer.id !== post.author.id ? post.reviewer : null;
  if (reviewer) graph.push(personNode(reviewer));

  // --- breadcrumb -----------------------------------------------------------------------------
  if (post.seo.breadcrumbEnabled) {
    const items = [
      { name: "Home", item: `${SITE_URL}/` },
      { name: "Blog", item: `${SITE_URL}/blog` },
      ...(post.category ? [{ name: post.category.name, item: `${SITE_URL}/blog/category/${post.category.slug}` }] : []),
      { name: post.title, item: url },
    ];
    graph.push({
      "@type": "BreadcrumbList",
      "@id": ids.breadcrumb,
      itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.item })),
    });
  }

  // --- web page -------------------------------------------------------------------------------
  graph.push(
    compact({
      "@type": "WebPage",
      "@id": ids.webpage,
      url,
      name: post.seo.seoTitle || post.title,
      description,
      isPartOf: ref(WEBSITE_ID),
      primaryImageOfPage: ref(ids.image),
      image: ref(ids.image),
      breadcrumb: post.seo.breadcrumbEnabled ? ref(ids.breadcrumb) : undefined,
      datePublished: post.publishedAt,
      dateModified: post.modifiedAt,
      lastReviewed: post.lastReviewedAt ?? undefined,
      reviewedBy: post.reviewer ? ref(personId(post.reviewer)) : undefined,
      inLanguage: lang,
      mainEntity: ref(ids.article),
      speakable: post.schemaExtras.speakableEnabled ? { "@type": "SpeakableSpecification", cssSelector: speakableSelectors(post) } : undefined,
    }),
  );

  // --- article --------------------------------------------------------------------------------
  const about = [post.ai.mainEntity, ...post.ai.about].filter((e): e is NonNullable<typeof e> => Boolean(e?.name));
  const uniqueAbout = [...new Map(about.map((e) => [e.name.toLowerCase(), e])).values()];
  graph.push(
    compact({
      "@type": "BlogPosting",
      "@id": ids.article,
      headline: (post.seo.seoTitle || post.title).slice(0, 110),
      name: post.title,
      description,
      abstract: post.ai.aiSummary,
      url,
      image: [ref(ids.image), ...contentImages],
      datePublished: post.publishedAt,
      dateModified: post.modifiedAt,
      author: ref(personId(post.author)),
      publisher: ref(ORGANIZATION_ID),
      mainEntityOfPage: ref(ids.webpage),
      isPartOf: ref(ids.webpage),
      articleSection: post.category?.name,
      keywords: [...new Set([post.seo.focusKeyword, ...post.seo.secondaryKeywords, ...post.tags.map((t) => t.name)].filter(Boolean))].join(", "),
      wordCount: post.wordCount || undefined,
      timeRequired: post.readingTimeMinutes ? `PT${post.readingTimeMinutes}M` : undefined,
      inLanguage: lang,
      about: uniqueAbout.map(entity),
      mentions: post.ai.mentions.map(entity),
    }),
  );

  // --- FAQ (rendered visibly in the article) --------------------------------------------------
  const faqs = post.ai.faqs.filter((f) => f.question.trim() && f.answer.trim());
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": ids.faq,
      isPartOf: ref(ids.webpage),
      inLanguage: lang,
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    });
  }

  // --- HowTo ----------------------------------------------------------------------------------
  const steps = post.schemaExtras.howToSteps.filter((s) => s.name.trim() && s.text.trim());
  if (post.ai.contentType === "HowTo" && steps.length) {
    graph.push(
      compact({
        "@type": "HowTo",
        "@id": ids.howto,
        name: post.title,
        description: post.ai.aiSummary || description,
        image: ref(ids.image),
        inLanguage: lang,
        isPartOf: ref(ids.webpage),
        step: steps.map((s, i) => {
          const img = socialImage(s.image);
          return compact({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text, image: img?.url });
        }),
      }),
    );
  }

  // --- Video: only videos actually embedded in the article ------------------------------------
  const extra = post.schemaExtras.video;
  const extraId = extra ? (extra.url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null) : null;
  post.contentVideos.forEach((v, i) => {
    const details = extra && extraId === v.youtubeId ? extra : null;
    const thumb = socialImage(details?.thumbnail);
    graph.push(
      compact({
        "@type": "VideoObject",
        "@id": `${url}#video-${i + 1}`,
        name: details?.name || v.title,
        description: details?.description || v.title,
        thumbnailUrl: thumb?.url ?? `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
        uploadDate: details?.uploadDate ?? undefined,
        duration: details?.duration || undefined,
        contentUrl: `https://www.youtube.com/watch?v=${v.youtubeId}`,
        embedUrl: details?.embedUrl || `https://www.youtube.com/embed/${v.youtubeId}`,
        isPartOf: ref(ids.webpage),
      }),
    );
  });

  // --- Review / Product (no ratings are ever invented) ----------------------------------------
  const review = post.schemaExtras.review;
  const isReview = post.ai.contentType === "Review" || post.ai.contentType === "ProductReview";
  if (isReview && review?.itemName) {
    const product = post.ai.contentType === "ProductReview" ? post.schemaExtras.product : null;
    const notes = (list: string[]) =>
      list.length ? { "@type": "ItemList", itemListElement: list.map((n, i) => ({ "@type": "ListItem", position: i + 1, name: n })) } : undefined;
    if (product?.name) {
      graph.push(
        compact({
          "@type": "Product",
          "@id": ids.product,
          name: product.name,
          brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
          sku: product.sku,
          image: ref(ids.image),
          review: ref(ids.review),
        }),
      );
    }
    graph.push(
      compact({
        "@type": "Review",
        "@id": ids.review,
        name: post.title,
        itemReviewed: product?.name ? ref(ids.product) : { "@type": review.itemType || "Thing", name: review.itemName },
        author: ref(personId(post.author)),
        publisher: ref(ORGANIZATION_ID),
        datePublished: post.publishedAt,
        reviewBody: post.ai.aiSummary || description,
        reviewRating:
          review.ratingValue !== null ? { "@type": "Rating", ratingValue: review.ratingValue, bestRating: review.bestRating, worstRating: 1 } : undefined,
        positiveNotes: notes(review.pros),
        negativeNotes: notes(review.cons),
        isPartOf: ref(ids.webpage),
      }),
    );
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

// ---------------------------------------------------------------------------------------------
// Local validation (required / recommended properties used by Google & Schema.org)
// ---------------------------------------------------------------------------------------------

export type SchemaIssue = { type: string; level: "error" | "warning"; message: string };

const typeOf = (n: Node) => (Array.isArray(n["@type"]) ? (n["@type"] as string[]).join("/") : String(n["@type"]));

export function validateSchema(graph: SchemaGraph, post?: Pick<PublicPost, "schemaExtras" | "contentVideos" | "ai">): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const err = (type: string, message: string) => issues.push({ type, level: "error", message });
  const warn = (type: string, message: string) => issues.push({ type, level: "warning", message });
  const has = (n: Node, k: string) => n[k] !== undefined && n[k] !== "";

  for (const n of graph["@graph"]) {
    const t = typeOf(n);
    switch (n["@type"]) {
      case "BlogPosting":
        for (const k of ["headline", "image", "datePublished", "author", "publisher"]) if (!has(n, k)) err(t, `Missing required "${k}".`);
        if (String(n.headline ?? "").length > 110) warn(t, "Headline is longer than 110 characters.");
        if (!has(n, "dateModified")) warn(t, 'Missing recommended "dateModified".');
        if (!has(n, "description")) warn(t, "Add a meta description.");
        if (!has(n, "about")) warn(t, "No entities set (AI SEO → Entity SEO).");
        break;
      case "Person":
        if (!has(n, "name")) err(t, "Author has no name.");
        if (!has(n, "url")) warn(t, "Author has no profile URL.");
        if (!has(n, "sameAs")) warn(t, `${n.name ?? "Author"} has no sameAs profiles (LinkedIn, website…).`);
        if (!has(n, "knowsAbout")) warn(t, `${n.name ?? "Author"} has no expertise (knowsAbout).`);
        break;
      case "FAQPage": {
        const qs = (n.mainEntity as Node[]) ?? [];
        if (!qs.length) err(t, "FAQPage needs at least one question.");
        break;
      }
      case "HowTo": {
        const steps = (n.step as Node[]) ?? [];
        if (steps.length < 2) warn(t, "HowTo usually needs at least two steps.");
        break;
      }
      case "VideoObject":
        for (const k of ["name", "thumbnailUrl"]) if (!has(n, k)) err(t, `Missing required "${k}".`);
        if (!has(n, "uploadDate")) err(t, 'Missing required "uploadDate". Add it under Schema → Video details using the same YouTube URL.');
        if (!has(n, "description")) warn(t, 'Missing recommended "description".');
        break;
      case "Review":
        if (!has(n, "itemReviewed")) err(t, 'Missing required "itemReviewed".');
        if (!has(n, "author")) err(t, 'Missing required "author".');
        if (!has(n, "reviewRating")) warn(t, "No rating given. That's fine; ratings are never invented, but review snippets need one.");
        break;
      case "Product":
        if (!has(n, "name")) err(t, 'Missing required "name".');
        break;
      case "BreadcrumbList":
        if (((n.itemListElement as Node[]) ?? []).length < 2) warn(t, "Breadcrumb has fewer than two items.");
        break;
    }
  }
  if (post) {
    if (post.schemaExtras.video?.url && !graph["@graph"].some((n) => n["@type"] === "VideoObject")) {
      warn("VideoObject", "Video details are set, but no matching YouTube video is embedded in the content, so no VideoObject is emitted.");
    }
    if (post.ai.contentType === "HowTo" && !graph["@graph"].some((n) => n["@type"] === "HowTo")) {
      warn("HowTo", "Content type is HowTo but no steps are filled in (Schema tab).");
    }
    if ((post.ai.contentType === "Review" || post.ai.contentType === "ProductReview") && !graph["@graph"].some((n) => n["@type"] === "Review")) {
      warn("Review", "Content type is a review but no reviewed item is filled in (Schema tab).");
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------------------------
// Listing pages: /blog, category, tag (CollectionPage) and author (ProfilePage)
// ---------------------------------------------------------------------------------------------

export function buildListingSchema(opts: {
  settings: SiteSettingsData;
  path: string;
  name: string;
  description: string;
  crumbs: { name: string; path: string }[];
  posts: { slug: string; title: string }[];
  author?: PublicAuthor;
}): SchemaGraph {
  const url = `${SITE_URL}${opts.path}`;
  const graph: Node[] = [organizationNode(opts.settings), websiteNode()];
  graph.push({
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: opts.crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.path}` })),
  });
  if (opts.author) graph.push(personNode(opts.author));
  graph.push(
    compact({
      "@type": opts.author ? "ProfilePage" : "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: opts.name,
      description: opts.description,
      isPartOf: ref(WEBSITE_ID),
      breadcrumb: ref(`${url}#breadcrumb`),
      inLanguage: "en-IN",
      mainEntity: opts.author
        ? ref(personId(opts.author))
        : opts.posts.length
          ? {
              "@type": "ItemList",
              itemListElement: opts.posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: postUrl(p.slug), name: p.title })),
            }
          : undefined,
    }),
  );
  return { "@context": "https://schema.org", "@graph": graph };
}
