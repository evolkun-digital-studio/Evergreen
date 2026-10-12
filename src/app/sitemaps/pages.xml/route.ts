import { buildSitemap, xmlHeaders } from "@/lib/seo/sitemap";

export async function GET() {
  return new Response(await buildSitemap("pages"), { headers: xmlHeaders });
}
