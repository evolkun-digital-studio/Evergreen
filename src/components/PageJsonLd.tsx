import { getSiteSettings } from "@/lib/data/settings";
import { organizationNode, leadershipNodes, serializeJsonLd, websiteNode } from "@/lib/seo/jsonld";
import { pageGraph, type PageGraphInput } from "@/lib/seo/pages";

/**
 * One JSON-LD @graph per page: the site-wide Organization, Person and WebSite nodes plus this
 * page's WebPage, BreadcrumbList, ImageObject, FAQPage and any extra nodes, linked by @id.
 */
export async function PageJsonLd(props: PageGraphInput) {
  const settings = await getSiteSettings();
  const graph = { "@context": "https://schema.org", "@graph": [organizationNode(settings), ...leadershipNodes(), websiteNode(), ...pageGraph(props)] };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }} />;
}
