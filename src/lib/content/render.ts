import "server-only";
import { createHighlighter, type Highlighter } from "shiki";
import sanitizeHtml from "sanitize-html";
import { SITE_URL } from "@/lib/cms/constants";
import { pickVariantUrl, srcSet, type MediaRef } from "@/lib/media/types";
import { buildTocTree, clampHeadingLevel, extractHeadings, nodeText, type Heading, type TocItem } from "./toc";
import { countWords, docToText, readingTimeMinutes } from "./text";
import {
  CALLOUT_LABELS,
  CALLOUT_VARIANTS,
  CODE_LANGUAGE_VALUES,
  NODES,
  youtubeId,
  type CalloutVariant,
  type PMMark,
  type PMNode,
} from "./types";

type RenderContext = {
  keyTakeaways?: string[];
  faqs?: { question: string; answer: string }[];
  /** Media referenced by image nodes, keyed by id, for responsive <picture> output. */
  media?: Map<string, MediaRef>;
};

type ContentLink = { href: string; text: string; internal: boolean; rel: string };
type ContentImage = { src: string; alt: string; mediaId: string | null; caption: string; width: number; height: number };
type ContentVideo = { youtubeId: string; url: string; title: string };

type RenderResult = {
  html: string;
  text: string;
  wordCount: number;
  readingTimeMinutes: number;
  headings: Heading[];
  toc: TocItem[];
  links: ContentLink[];
  images: ContentImage[];
  videos: ContentVideo[];
  blocks: { callouts: number; expertQuotes: number; codeBlocks: number; tables: number; lists: number };
};

// ---------------------------------------------------------------------------------------------
// Escaping & URL safety
// ---------------------------------------------------------------------------------------------

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function safeHref(href: unknown): string | null {
  const h = String(href ?? "").trim();
  if (!h) return null;
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (h.startsWith("#")) return h;
  return null;
}

function isInternalHref(href: string): boolean {
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    return new URL(href).host === new URL(SITE_URL).host;
  } catch {
    return false;
  }
}

const REL_FLAGS = new Set(["nofollow", "sponsored", "ugc"]);

// ---------------------------------------------------------------------------------------------
// Shiki (server-only, no client JS)
// ---------------------------------------------------------------------------------------------

let highlighter: Promise<Highlighter> | null = null;
function getHighlighter() {
  highlighter ??= createHighlighter({
    themes: ["github-light"],
    langs: CODE_LANGUAGE_VALUES.filter((l) => l !== "plaintext"),
  });
  return highlighter;
}

async function highlight(code: string, language: string): Promise<string> {
  const lang = CODE_LANGUAGE_VALUES.includes(language) && language !== "plaintext" ? language : "text";
  const h = await getHighlighter();
  return h.codeToHtml(code, { lang, theme: "github-light" });
}

// ---------------------------------------------------------------------------------------------
// Icons for callouts (inline SVG keeps the article free of icon-font requests)
// ---------------------------------------------------------------------------------------------

const ICON_PATHS: Record<CalloutVariant, string> = {
  important: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  tip: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  note: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
};
const icon = (v: CalloutVariant) =>
  `<svg class="callout-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[v]}</svg>`;

// ---------------------------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------------------------

type State = {
  ctx: RenderContext;
  headingIds: string[];
  headingIndex: number;
  toc: TocItem[];
  links: ContentLink[];
  images: ContentImage[];
  videos: ContentVideo[];
  blocks: RenderResult["blocks"];
};

function renderMarks(text: string, marks: PMMark[] | undefined, state: State): string {
  let out = esc(text);
  // Link is applied last so it wraps the other inline formatting.
  const ordered = [...(marks ?? [])].sort((a, b) => (a.type === "link" ? 1 : 0) - (b.type === "link" ? 1 : 0));
  for (const mark of ordered) {
    switch (mark.type) {
      case "bold":
        out = `<strong>${out}</strong>`;
        break;
      case "italic":
        out = `<em>${out}</em>`;
        break;
      case "underline":
        out = `<u>${out}</u>`;
        break;
      case "strike":
        out = `<s>${out}</s>`;
        break;
      case "code":
        out = `<code>${out}</code>`;
        break;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) break;
        const internal = isInternalHref(href);
        const flags = String(mark.attrs?.rel ?? "")
          .split(/\s+/)
          .filter((r) => REL_FLAGS.has(r));
        const newTab = mark.attrs?.target === "_blank";
        const rel = [...(internal ? [] : ["noopener"]), ...(newTab && internal ? ["noopener"] : []), ...flags];
        const relAttr = rel.length ? ` rel="${esc([...new Set(rel)].join(" "))}"` : "";
        out = `<a href="${esc(href)}"${newTab ? ' target="_blank"' : ""}${relAttr}>${out}</a>`;
        state.links.push({ href, text, internal, rel: [...new Set(rel)].join(" ") });
        break;
      }
    }
  }
  return out;
}

function pictureHtml(img: ContentImage, media: MediaRef | undefined): string {
  const alt = esc(img.alt);
  if (!media) {
    const dims = img.width && img.height ? ` width="${img.width}" height="${img.height}"` : "";
    return `<img src="${esc(img.src)}" alt="${alt}"${dims} loading="lazy" decoding="async">`;
  }
  const sizes = "(min-width: 1024px) 720px, 100vw";
  const sources = [
    media.variants.avif?.length ? `<source type="image/avif" srcset="${esc(srcSet(media.variants.avif))}" sizes="${sizes}">` : "",
    media.variants.webp?.length ? `<source type="image/webp" srcset="${esc(srcSet(media.variants.webp))}" sizes="${sizes}">` : "",
  ].join("");
  const fallback = pickVariantUrl(media, 1280);
  const style = media.blurDataURL
    ? ` style="background-image:url(${esc(media.blurDataURL)});background-size:cover"`
    : "";
  return `<picture>${sources}<img src="${esc(fallback)}" alt="${alt}" width="${media.width}" height="${media.height}" loading="lazy" decoding="async"${style}></picture>`;
}

function renderTocList(items: TocItem[]): string {
  if (!items.length) return "";
  return `<ol>${items
    .map((i) => `<li><a href="#${esc(i.id)}">${esc(i.text)}</a>${renderTocList(i.children)}</li>`)
    .join("")}</ol>`;
}

async function renderChildren(node: PMNode, state: State): Promise<string> {
  const parts = await Promise.all((node.content ?? []).map((c) => renderNode(c, state)));
  return parts.join("");
}

async function renderNode(node: PMNode, state: State): Promise<string> {
  const a = node.attrs ?? {};
  switch (node.type) {
    case "doc":
      return renderChildren(node, state);
    case "text":
      return renderMarks(node.text ?? "", node.marks, state);
    case "paragraph": {
      const inner = await renderChildren(node, state);
      return inner ? `<p>${inner}</p>` : "";
    }
    case "heading": {
      // Same skip rule as extractHeadings, so ids line up with the TOC.
      if (!nodeText(node).trim()) return "";
      const level = clampHeadingLevel(a.level);
      const id = state.headingIds[state.headingIndex++] ?? "";
      const inner = await renderChildren(node, state);
      return `<h${level} id="${esc(id)}"><a class="heading-anchor" href="#${esc(id)}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${level}>`;
    }
    case "bulletList":
      state.blocks.lists++;
      return `<ul>${await renderChildren(node, state)}</ul>`;
    case "orderedList": {
      state.blocks.lists++;
      const start = Number(a.start ?? 1);
      return `<ol${start !== 1 ? ` start="${start}"` : ""}>${await renderChildren(node, state)}</ol>`;
    }
    case "listItem":
      return `<li>${await renderChildren(node, state)}</li>`;
    case "blockquote":
      return `<blockquote>${await renderChildren(node, state)}</blockquote>`;
    case "horizontalRule":
      return "<hr>";
    case "hardBreak":
      return "<br>";
    case "codeBlock": {
      state.blocks.codeBlocks++;
      const code = (node.content ?? []).map((c) => c.text ?? "").join("");
      const language = String(a.language ?? "plaintext");
      const filename = String(a.filename ?? "").trim();
      const highlighted = await highlight(code, language);
      return `<figure class="code-block" data-language="${esc(language)}">${
        filename ? `<figcaption class="code-filename">${esc(filename)}</figcaption>` : ""
      }<button type="button" class="copy-code" data-copy-code aria-label="Copy code">Copy</button>${highlighted}</figure>`;
    }
    case "image": {
      const mediaId = a.mediaId ? String(a.mediaId) : null;
      const media = mediaId ? state.ctx.media?.get(mediaId) : undefined;
      const img: ContentImage = {
        src: media?.url ?? String(a.src ?? ""),
        alt: String(a.alt ?? media?.alt ?? ""),
        mediaId,
        caption: String(a.caption ?? ""),
        width: Number(media?.width ?? a.width ?? 0),
        height: Number(media?.height ?? a.height ?? 0),
      };
      if (!safeHref(img.src)) return "";
      state.images.push(img);
      const caption = img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : "";
      return `<figure class="content-image">${pictureHtml(img, media)}${caption}</figure>`;
    }
    case "table":
      state.blocks.tables++;
      return `<div class="table-wrap"><table>${await renderChildren(node, state)}</table></div>`;
    case "tableRow":
      return `<tr>${await renderChildren(node, state)}</tr>`;
    case "tableHeader":
    case "tableCell": {
      const tag = node.type === "tableHeader" ? "th" : "td";
      const span = [
        Number(a.colspan ?? 1) > 1 ? ` colspan="${Number(a.colspan)}"` : "",
        Number(a.rowspan ?? 1) > 1 ? ` rowspan="${Number(a.rowspan)}"` : "",
        tag === "th" ? ' scope="col"' : "",
      ].join("");
      // Cells hold paragraphs; unwrap a single paragraph to keep table markup tight.
      const inner = await renderChildren(node, state);
      const unwrapped = /^<p>((?:(?!<p>)[\s\S])*)<\/p>$/.exec(inner)?.[1] ?? inner;
      return `<${tag}${span}>${unwrapped}</${tag}>`;
    }
    case NODES.callout: {
      state.blocks.callouts++;
      const variant = (CALLOUT_VARIANTS as readonly string[]).includes(String(a.variant))
        ? (a.variant as CalloutVariant)
        : "note";
      const title = String(a.title ?? "").trim() || CALLOUT_LABELS[variant];
      return `<aside class="callout callout-${variant}" role="note" aria-label="${esc(CALLOUT_LABELS[variant])}">${icon(
        variant,
      )}<div class="callout-body"><p class="callout-title">${esc(title)}</p>${await renderChildren(node, state)}</div></aside>`;
    }
    case NODES.expertQuote: {
      const quote = String(a.quote ?? "").trim();
      if (!quote) return "";
      state.blocks.expertQuotes++;
      const source = safeHref(a.sourceUrl);
      const cite = source ? ` cite="${esc(source)}"` : "";
      const name = String(a.name ?? "").trim();
      const role = String(a.role ?? "").trim();
      const nameHtml = source
        ? `<a href="${esc(source)}"${isInternalHref(source) ? "" : ' rel="noopener"'}>${esc(name)}</a>`
        : esc(name);
      if (source) state.links.push({ href: source, text: name, internal: isInternalHref(source), rel: "noopener" });
      return `<figure class="expert-quote"><blockquote${cite}><p>${esc(quote)}</p></blockquote>${
        name ? `<figcaption>— <cite>${nameHtml}</cite>${role ? `, <span class="expert-role">${esc(role)}</span>` : ""}</figcaption>` : ""
      }</figure>`;
    }
    case NODES.videoEmbed: {
      const url = String(a.url ?? "");
      const id = youtubeId(url);
      if (!id) return "";
      const title = String(a.title ?? "").trim() || "YouTube video";
      state.videos.push({ youtubeId: id, url: `https://www.youtube.com/watch?v=${id}`, title });
      // Lite facade: a thumbnail link that works without JS; the article script swaps in the iframe.
      return `<figure class="video-embed"><a class="yt-facade" href="https://www.youtube.com/watch?v=${esc(id)}" data-youtube-id="${esc(
        id,
      )}" data-title="${esc(title)}"><img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="${esc(
        `Play video: ${title}`,
      )}" width="480" height="360" loading="lazy" decoding="async"><span class="yt-play" aria-hidden="true"></span></a><figcaption>${esc(
        title,
      )}</figcaption></figure>`;
    }
    case NODES.keyTakeaways: {
      const items = (state.ctx.keyTakeaways ?? []).filter((t) => t.trim());
      if (!items.length) return "";
      return `<section class="key-takeaways" aria-labelledby="key-takeaways-title" data-speakable="takeaways"><h2 id="key-takeaways-title" class="key-takeaways-title">Key takeaways</h2><ul>${items
        .map((t) => `<li>${esc(t)}</li>`)
        .join("")}</ul></section>`;
    }
    case NODES.faq: {
      const faqs = (state.ctx.faqs ?? []).filter((f) => f.question.trim() && f.answer.trim());
      if (!faqs.length) return "";
      return `<section class="faq" aria-labelledby="faq-title"><h2 id="faq-title">Frequently asked questions</h2>${faqs
        .map(
          (f) =>
            `<details class="faq-item"><summary><h3 class="faq-question">${esc(f.question)}</h3></summary><div class="faq-answer"><p>${esc(
              f.answer,
            ).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p></div></details>`,
        )
        .join("")}</section>`;
    }
    case NODES.toc: {
      if (!state.toc.length) return "";
      return `<nav class="toc-inline" aria-label="Table of contents"><p class="toc-title">Contents</p>${renderTocList(state.toc)}</nav>`;
    }
    default:
      // Unknown node: keep its text content rather than dropping it silently.
      return renderChildren(node, state);
  }
}

// ---------------------------------------------------------------------------------------------
// Final allowlist sanitisation (defence in depth on top of the escaping renderer)
// ---------------------------------------------------------------------------------------------

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "h2", "h3", "h4", "strong", "em", "u", "s", "code", "pre", "a", "ul", "ol", "li", "blockquote", "hr", "br",
    "figure", "figcaption", "picture", "source", "img", "div", "span", "table", "thead", "tbody", "tr", "th", "td",
    "aside", "section", "nav", "details", "summary", "cite", "button", "svg", "path", "circle",
  ],
  allowedAttributes: {
    "*": ["class", "id", "aria-label", "aria-labelledby", "aria-hidden", "role", "data-*"],
    a: ["href", "target", "rel", "tabindex"],
    img: ["src", "alt", "width", "height", "loading", "decoding", "style"],
    source: ["type", "srcset", "sizes"],
    ol: ["start"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    blockquote: ["cite"],
    pre: ["style", "tabindex"],
    span: ["style"],
    button: ["type"],
    svg: ["viewBox", "width", "height", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
    path: ["d"],
    circle: ["cx", "cy", "r"],
  },
  allowedStyles: {
    span: { color: [/^#[0-9a-f]{3,8}$/i], "font-weight": [/^bold$/], "text-decoration": [/^underline$/] },
    pre: { color: [/^#[0-9a-f]{3,8}$/i], "background-color": [/^#[0-9a-f]{3,8}$/i] },
    img: { "background-image": [/^url\(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+\)$/], "background-size": [/^cover$/] },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  parser: { lowerCaseAttributeNames: false },
};

function sanitizeContentHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE);
}

/** Renders a Tiptap document to sanitised HTML and collects everything the CMS derives from it. */
export async function renderContent(doc: PMNode, ctx: RenderContext = {}): Promise<RenderResult> {
  const headings = extractHeadings(doc);
  const state: State = {
    ctx,
    headingIds: headings.map((h) => h.id),
    headingIndex: 0,
    toc: buildTocTree(headings),
    links: [],
    images: [],
    videos: [],
    blocks: { callouts: 0, expertQuotes: 0, codeBlocks: 0, tables: 0, lists: 0 },
  };
  const raw = await renderNode(doc, state);
  const text = docToText(doc, ctx);
  const wordCount = countWords(text);
  return {
    html: sanitizeContentHtml(raw),
    text,
    wordCount,
    readingTimeMinutes: readingTimeMinutes(wordCount),
    headings,
    toc: state.toc,
    links: state.links,
    images: state.images,
    videos: state.videos,
    blocks: state.blocks,
  };
}
