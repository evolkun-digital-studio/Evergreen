import { buildSitemapIndex, xmlHeaders } from "@/lib/seo/sitemap";
import { connection } from "next/server";

export async function GET() {
  await connection();
  return new Response(await buildSitemapIndex(), { headers: xmlHeaders });
}
