import type { Metadata } from "next";
import { site } from "@/config/site";
import type { Photo } from "@/content/images";
import { SITE_URL } from "@/lib/cms/constants";
import { ORGANIZATION_ID, WEBSITE_ID } from "./jsonld";

export type Crumb = { name: string; path: string };

const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  image,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  /** 1200×630 social image; defaults to the brand card. */
  image?: { url: string; alt: string };
}): Metadata {
  const img = { url: image?.url ?? "/brand/og-default.png", width: 1200, height: 630, alt: image?.alt ?? `${site.name} logo` };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "en_IN",
      title,
      description,
      url: path,
      images: [img],
    },
    twitter: { card: "summary_large_image", title, description, images: [img.url] },
  };
}

export type PageGraphInput = {
  path: string;
  name: string;
  description: string;
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
  crumbs?: Crumb[];
  /** Header photo: emitted as the page's primaryImageOfPage (ImageObject). */
  image?: Photo;
  /** FAQ shown on the page: emitted as FAQPage. */
  faq?: { q: string; a: string }[];
  extra?: Record<string, unknown>[];
};

export const pageUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

export function imageObject(photo: Photo, id: string) {
  return {
    "@type": "ImageObject",
    "@id": id,
    url: abs(photo.src.src),
    contentUrl: abs(photo.src.src),
    width: photo.src.width,
    height: photo.src.height,
    caption: photo.alt,
    ...(photo.stock ? { description: "Representative stock image" } : {}),
  };
}

export function faqNode(url: string, faq: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** WebPage (or subtype) + BreadcrumbList + ImageObject + FAQPage, plus any page-specific nodes. */
export function pageGraph({ path, name, description, type = "WebPage", crumbs = [], image, faq, extra = [] }: PageGraphInput) {
  const url = pageUrl(path);
  const trail = [{ name: "Home", path: "/" }, ...crumbs];
  const imageId = `${url}#primaryimage`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": type,
      "@id": `${url}#webpage`,
      url,
      name,
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en-IN",
      ...(crumbs.length ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
      ...(image ? { primaryImageOfPage: { "@id": imageId } } : {}),
      ...(faq?.length ? { mainEntity: { "@id": `${url}#faq` } } : {}),
    },
    ...(image ? [imageObject(image, imageId)] : []),
    ...(faq?.length ? [faqNode(url, faq)] : []),
    ...extra,
  ];
  if (crumbs.length) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: trail.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: pageUrl(c.path),
      })),
    });
  }
  return graph;
}
