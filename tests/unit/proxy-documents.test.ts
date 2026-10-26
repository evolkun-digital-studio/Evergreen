import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({
  default: () => ({ auth: (handler: unknown) => handler }),
}));
vi.mock("@/lib/redirects/client", () => ({
  resolveManagedRedirect: vi.fn(),
}));

const { proxy } = await import("@/proxy");

const run = (path: string) => proxy(new NextRequest(`https://evergreen.example${path}`), {} as never);

describe("proxy rules for /documents", () => {
  it.each(["/documents", "/documents/login", "/documents/access/65f000000000000000000000.tok", "/documents/shared"])(
    "lets a signed-out visitor reach %s",
    async (path) => {
      const response = await run(path);
      if (!response) throw new Error("Expected a response");
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );

  it("sends a signed-out visitor from the staff library to the login", async () => {
    const response = await run("/documents/library");
    if (!response) throw new Error("Expected a response");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://evergreen.example/documents/login?next=%2Fdocuments%2Flibrary");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});
