import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  default: () => ({ auth: (handler: unknown) => handler }),
}));
vi.mock("@/lib/redirects/client", () => ({
  resolveManagedRedirect: vi.fn(),
}));

const redirects = await import("@/lib/redirects/client");
const { config, proxy } = await import("@/proxy");

describe("proxy matcher", () => {
  it.each([
    "/api/redirects/resolve?path=%2F",
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Fbrand%2Flogo.png&w=640&q=75",
    "/favicon.ico",
    "/videos/hero-720.webm",
    "/videos/hero-720.mp4",
    "/images/home/yard-handler.jpg",
    "/fonts/site.woff2",
  ])("does not run for non-page request %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });

  it.each(["/", "/about", "/blog/old-slug", "/admin/login"])(
    "continues to run for page request %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    },
  );

  it("keeps managed redirects working for normal page paths", async () => {
    vi.mocked(redirects.resolveManagedRedirect).mockResolvedValueOnce({
      to: "/blog/new-slug",
      code: 301,
    });

    const response = await proxy(
      new NextRequest("https://evergreen.example/blog/old-slug?source=test"),
      {} as never,
    );

    if (!response) throw new Error("Expected the proxy to return a redirect response");
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://evergreen.example/blog/new-slug?source=test",
    );
  });
});
