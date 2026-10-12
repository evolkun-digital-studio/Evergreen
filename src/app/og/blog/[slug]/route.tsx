import { ImageResponse } from "next/og";
import { getPublishedPost } from "@/lib/data/blog";
import { getSiteSettings } from "@/lib/data/settings";
import { SITE_URL } from "@/lib/cms/constants";

// Generated 1200×630 social card, used only when a post has no OG image, featured image or
// site default (see postOgImage in lib/seo/metadata.ts).
export async function GET(_request: Request, ctx: RouteContext<"/og/blog/[slug]">) {
  const { slug } = await ctx.params;
  const [post, settings] = await Promise.all([getPublishedPost(slug), getSiteSettings()]);
  const title = post ? post.seo.ogTitle || post.title : `${settings.siteTitle} Blog`;
  const eyebrow = post?.category?.name ?? "Evergreen Insights";
  const fontSize = title.length > 90 ? 52 : title.length > 60 ? 60 : 68;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0F3A21 0%, #1A6B37 100%)",
          color: "#ffffff",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", right: -120, top: -120, width: 460, height: 460, borderRadius: 9999, background: "rgba(44, 147, 69,0.22)" }} />
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#CFE57A", letterSpacing: 1, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ display: "flex", fontSize, fontWeight: 600, lineHeight: 1.15, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 8, borderRadius: 4, background: "#B6D433" }} />
          <div style={{ display: "flex", fontSize: 30, color: "#EEF5E6" }}>{settings.siteTitle} · {new URL(SITE_URL).host}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
    },
  );
}
