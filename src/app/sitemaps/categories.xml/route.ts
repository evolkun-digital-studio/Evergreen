import { buildSitemap, xmlHeaders } from "@/lib/seo/sitemap";

export async function GET() {
  return new Response(await buildSitemap("categories"), { headers: xmlHeaders });
}
