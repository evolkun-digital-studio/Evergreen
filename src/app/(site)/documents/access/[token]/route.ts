import { NextResponse } from "next/server";
import { lookupByToken } from "@/lib/data/document-requests";
import { GRANT_COOKIE, encodeGrantCookie, grantCookieMaxAge, parseGrantCookie } from "@/lib/documents/grant";

// The emailed link. A valid token becomes an HTTP-only cookie so file URLs never carry it, then the
// visitor lands on /documents/shared. Every other outcome looks the same: back to the request page.
const PRIVATE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: Request, ctx: RouteContext<"/documents/access/[token]">) {
  const { token } = await ctx.params;
  // The path segment has the same shape as the cookie value: `<requestId>.<rawToken>`. Its characters
  // (hex, base64url, one dot) never need decoding, and decoding a malformed `%` would throw.
  const parsed = parseGrantCookie(token);
  const grant = parsed ? await lookupByToken(parsed.requestId, parsed.rawToken).catch(() => null) : null;

  if (!parsed || !grant) {
    return NextResponse.redirect(new URL("/documents?link=invalid", request.url), { headers: PRIVATE });
  }

  const response = NextResponse.redirect(new URL("/documents/shared", request.url), { headers: PRIVATE });
  response.cookies.set(GRANT_COOKIE, encodeGrantCookie(parsed.requestId, parsed.rawToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: grantCookieMaxAge(grant.expiresAt),
  });
  return response;
}
