import { after } from "next/server";
import { findRedirect, recordHit } from "@/lib/redirects/lookup";

export async function GET(request: Request) {
  const pathname = new URL(request.url).searchParams.get("path");
  if (!pathname || !pathname.startsWith("/") || pathname.length > 2_048) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  const hit = await findRedirect(pathname);
  if (!hit)
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });

  after(() => recordHit(pathname));
  return Response.json(hit, { headers: { "Cache-Control": "no-store" } });
}
