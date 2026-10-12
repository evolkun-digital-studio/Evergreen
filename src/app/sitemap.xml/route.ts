import { buildSitemapIndex, xmlHeaders } from "@/lib/seo/sitemap";

export async function GET() {
  return new Response(await buildSitemapIndex(), { headers: xmlHeaders });
}
