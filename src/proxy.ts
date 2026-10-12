import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { findRedirect, recordHit } from "@/lib/redirects/lookup";

// Database-free Auth.js instance: verifies the JWT cookie only. Every page and Server
// Action still re-checks the user and role through the data access layer.
const { auth } = NextAuth(authConfig);

const NOINDEX = "noindex, nofollow";

const adminGate = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = pathname === "/admin/login";

  if (isAdmin && !isLogin && !request.auth) {
    const login = new URL("/admin/login", request.nextUrl);
    login.searchParams.set("callbackUrl", pathname + search);
    const res = NextResponse.redirect(login);
    res.headers.set("X-Robots-Tag", NOINDEX);
    return res;
  }
  if (isLogin && request.auth) return NextResponse.redirect(new URL("/admin", request.nextUrl));

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", NOINDEX);
  return res;
});

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname, search } = request.nextUrl;

  // IndexNow key verification file: /<INDEXNOW_KEY>.txt
  const key = process.env.INDEXNOW_KEY;
  if (key && pathname === `/${key}.txt`) {
    return new NextResponse(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/")) {
    return adminGate(request, event as never);
  }

  // Redirects managed in the CMS (SEO Tools → Redirects), including automatic slug-change 301s.
  const hit = await findRedirect(pathname);
  if (hit) {
    event.waitUntil(recordHit(pathname));
    const target = /^https?:\/\//i.test(hit.to) ? hit.to : new URL(hit.to + search, request.url);
    return NextResponse.redirect(target, hit.code);
  }

  if (pathname.startsWith("/blog/preview/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", NOINDEX);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  // Everything except build assets, local uploads and static files.
  matcher: ["/((?!_next/static|_next/image|uploads/|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|woff2?|map)$).*)"],
};
