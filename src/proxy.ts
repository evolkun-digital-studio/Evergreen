import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { resolveManagedRedirect } from "@/lib/redirects/client";

// Database-free Auth.js instance: verifies the JWT cookie only. Every page and Server
// Action still re-checks the user and role through the data access layer.
const { auth } = NextAuth(authConfig);

const NOINDEX = "noindex, nofollow";

// Auth.js wraps the exported proxy so its request.auth type and cookie handling stay aligned
// with the installed v5 API. Page/data layers still perform authoritative database checks.
export const proxy = auth(async (request) => {
  const { pathname, search } = request.nextUrl;

  // IndexNow key verification file: /<INDEXNOW_KEY>.txt
  const key = process.env.INDEXNOW_KEY;
  if (key && pathname === `/${key}.txt`) {
    return new NextResponse(key, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPublicAuth =
    pathname === "/admin/login" ||
    pathname === "/admin/forgot-password" ||
    pathname.startsWith("/admin/reset-password/") ||
    pathname.startsWith("/admin/accept-invite/");
  if (isAdmin) {
    if (!isPublicAuth && !request.auth) {
      const login = new URL("/admin/login", request.nextUrl);
      login.searchParams.set("callbackUrl", pathname + search);
      const response = NextResponse.redirect(login);
      response.headers.set("X-Robots-Tag", NOINDEX);
      return response;
    }
    if (isPublicAuth && request.auth) return NextResponse.redirect(new URL("/admin", request.nextUrl));
    if (!isPublicAuth && request.auth?.user?.role === "VIEWER") {
      return NextResponse.redirect(new URL("/documents/library", request.nextUrl));
    }
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", NOINDEX);
    return response;
  }

  if (pathname === "/documents" || pathname.startsWith("/documents/")) {
    // Only the staff library needs a session. The request form, the emailed-link route and the
    // shared list are public; the grant itself is verified against the database on each request.
    const isStaffLibrary = pathname === "/documents/library" || pathname.startsWith("/documents/library/");
    if (isStaffLibrary && !request.auth) {
      const login = new URL("/documents/login", request.nextUrl);
      login.searchParams.set("next", pathname + search);
      const response = NextResponse.redirect(login);
      response.headers.set("X-Robots-Tag", NOINDEX);
      return response;
    }
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", NOINDEX);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Redirects managed in the CMS (SEO Tools → Redirects), including automatic slug-change 301s.
  const hit = await resolveManagedRedirect(new URL(request.url));
  if (hit) {
    const target = /^https?:\/\//i.test(hit.to)
      ? hit.to
      : new URL(hit.to + search, request.url);
    return NextResponse.redirect(target, hit.code);
  }

  if (pathname.startsWith("/blog/preview/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", NOINDEX);
    return res;
  }
  return NextResponse.next();
});

export const config = {
  // Page paths only: redirect lookups do not belong on API or asset requests.
  matcher: [
    "/((?!api|_next/static|_next/image|uploads/|favicon.ico|.*\\.(?:webm|mp4|png|jpe?g|gif|webp|avif|svg|ico|css|js|woff2?|map)$).*)",
  ],
};
