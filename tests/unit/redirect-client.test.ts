import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveManagedRedirect } from "@/lib/redirects/client";

describe("managed redirect client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a redirect resolved by the internal Node endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ to: "/blog/new-slug", code: 301 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveManagedRedirect(
        new URL("https://evergreen.example/blog/old-slug?source=test")
      )
    ).resolves.toEqual({
      to: "/blog/new-slug",
      code: 301,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        "https://evergreen.example/api/redirects/resolve?path=%2Fblog%2Fold-slug"
      ),
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("fails open when the internal endpoint is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));

    await expect(
      resolveManagedRedirect(new URL("https://evergreen.example/about"))
    ).resolves.toBeNull();
  });
});
