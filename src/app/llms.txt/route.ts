import { cacheLife, cacheTag } from "next/cache";
import { listCategoriesWithPosts, listIndexablePosts } from "@/lib/data/blog";
import { SITE_URL } from "@/lib/cms/constants";
import { TAGS } from "@/lib/cache-tags";
import { fullAddress, site } from "@/config/site";
import { entity } from "@/content/entity";
import { services } from "@/content/services";
import { steps } from "@/content/company";
import { CAPACITY_LABEL, capacity, formatTonnes } from "@/content/stats";

// llms.txt (https://llmstxt.org): a plain-Markdown map of the site for AI assistants and
// generative engines: who we are, key pages, topic hubs and recent articles with one-line answers.

const oneLine = (s: string, max = 200) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : t;
};

async function buildLlmsTxt(): Promise<string> {
  "use cache";
  cacheTag(TAGS.posts, TAGS.categories, TAGS.settings);
  cacheLife("max");
  const [posts, categories] = await Promise.all([
    listIndexablePosts(50),
    listCategoriesWithPosts(),
  ]);
  const bc = site.businessContact;
  const lines = [
    `# ${site.name} (${site.legalName})`,
    "",
    `> ${oneLine(entity.summary, 400)}`,
    "",
    "## Company facts",
    "",
    `- Legal name: ${site.legalName}`,
    `- What it does: ${entity.whatWeDo}`,
    `- Plant: ${fullAddress()}, India`,
    `- Founded: ${site.founded}`,
    `- Pickup: PAN India, from client locations`,
    `- Authorisations: ${entity.authorisations}`,
    `- GSTIN: ${site.gstin}`,
    `- ${site.owner.role}: ${site.owner.honorific} ${site.owner.name}`,
    `- Phone and WhatsApp: ${site.phone}`,
    `- Business enquiries: ${bc.honorific} ${bc.name}, ${bc.phone}`,
    `- Email: ${site.email}`,
    "",
    `## ${CAPACITY_LABEL}`,
    "",
    "What the Sitapur plant can process in a year (not tonnes recycled):",
    "",
    ...capacity.map(
      c => `- ${c.material}: ${formatTonnes(c.tonnes)} (metric tonnes per year)`
    ),
    "",
    "## Services",
    "",
    ...services.map(
      s =>
        `- [${s.title}](${SITE_URL}/services/${s.slug}): ${oneLine(s.summary)}`
    ),
    "",
    "## Process",
    "",
    ...steps.map((s, i) => `${i + 1}. ${s.title}: ${s.short}`),
    "",
    `Details: ${SITE_URL}/process`,
    "",
    "## Tools",
    "",
    `- [E-waste EPR calculator](${SITE_URL}/epr-calculator): estimates a producer's annual e-waste recycling target and gold, copper, iron and aluminium obligations under the E-Waste (Management) Rules, 2022. Free; a planning estimate, not a CPCB figure.`,
    "",
    "## Key pages",
    "",
    `- [Home](${SITE_URL}/)`,
    `- [About](${SITE_URL}/about): the company, its owner and its capacity`,
    `- [Services](${SITE_URL}/services)`,
    `- [Certifications](${SITE_URL}/certifications): GST, UPPCB e-waste authorisation, battery waste authorisation, MSME`,
    `- [Sustainability](${SITE_URL}/sustainability)`,
    `- [Contact](${SITE_URL}/contact): request a pickup`,
    `- [Blog](${SITE_URL}/blog)`,
    `- [RSS feed](${SITE_URL}/blog/feed.xml)`,
  ];
  if (categories.length) {
    lines.push("", "## Topics", "");
    for (const c of categories)
      lines.push(
        `- [${c.name}](${SITE_URL}/blog/category/${c.slug})${c.description ? `: ${oneLine(c.description)}` : ""}`
      );
  }
  if (posts.length) {
    lines.push("", "## Articles", "");
    for (const p of posts)
      lines.push(
        `- [${p.title}](${SITE_URL}/blog/${p.slug})${p.summary ? `: ${oneLine(p.summary)}` : ""}`
      );
  }
  lines.push("", "## Optional", "", `- [Sitemap](${SITE_URL}/sitemap.xml)`, "");
  return lines.join("\n");
}

export async function GET() {
  return new Response(await buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
