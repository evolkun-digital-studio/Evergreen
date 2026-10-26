import { buildSitemap, xmlHeaders } from "@/lib/seo/sitemap";
import { connection } from "next/server";

export async function GET() {
  await connection();
  return new Response(await buildSitemap("categories"), { headers: xmlHeaders });
}
