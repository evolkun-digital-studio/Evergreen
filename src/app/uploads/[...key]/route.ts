import { readLocal } from "@/lib/media/storage";

// Serves files written by the `local` storage driver (development). Production deployments
// use the s3 or imagekit drivers, whose URLs point straight at the CDN.

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export async function GET(_request: Request, ctx: RouteContext<"/uploads/[...key]">) {
  const { key } = await ctx.params;
  const path = key.join("/");
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[ext];
  if (!type) return new Response("Not found", { status: 404 });

  const file = await readLocal(path);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // SVGs are sanitised on upload; this blocks script execution if one is opened directly.
      ...(ext === "svg" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
