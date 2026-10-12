import { buildSitemap, xmlHeaders } from "@/lib/seo/sitemap";

export async function GET() {
  return new Response(await buildSitemap("posts"), { headers: xmlHeaders });
}
