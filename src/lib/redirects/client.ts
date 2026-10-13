export type ManagedRedirect = { to: string; code: 301 | 302 };

export async function resolveManagedRedirect(
  requestUrl: URL
): Promise<ManagedRedirect | null> {
  const endpoint = new URL("/api/redirects/resolve", requestUrl);
  endpoint.searchParams.set("path", requestUrl.pathname);

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok || response.status === 204) return null;

    const value: unknown = await response.json();
    if (!value || typeof value !== "object") return null;

    const { to, code } = value as Partial<ManagedRedirect>;
    return typeof to === "string" && (code === 301 || code === 302)
      ? { to, code }
      : null;
  } catch {
    // Redirect lookup must fail open so an unavailable database never takes the site down.
    return null;
  }
}
