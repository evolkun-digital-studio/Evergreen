import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/document-requests", () => ({ lookupByToken: vi.fn() }));

const data = await import("@/lib/data/document-requests");
const { GET } = await import("@/app/(site)/documents/access/[token]/route");

const call = (token: string) =>
  GET(new Request(`https://evergreen.example/documents/access/${token}`), { params: Promise.resolve({ token }) } as never);

describe("emailed access link", () => {
  it.each(["%E0%A4%A", "garbage", "65f000000000000000000000.", "%"])("sends malformed link %s to the neutral invalid page", async (token) => {
    const response = await call(token);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://evergreen.example/documents?link=invalid");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sends a link the database rejects to the invalid page", async () => {
    vi.mocked(data.lookupByToken).mockResolvedValueOnce(null);
    const response = await call("65f000000000000000000000.nope");
    expect(response.headers.get("location")).toBe("https://evergreen.example/documents?link=invalid");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sets an HTTP-only cookie and lands on the shared list for a valid link", async () => {
    vi.mocked(data.lookupByToken).mockResolvedValueOnce({
      requestId: "65f000000000000000000000",
      email: "a@b.com",
      scope: "all",
      documentIds: [],
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const response = await call("65f000000000000000000000.tok-en_1");
    expect(response.headers.get("location")).toBe("https://evergreen.example/documents/shared");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("doc_grant=65f000000000000000000000.tok-en_1");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
