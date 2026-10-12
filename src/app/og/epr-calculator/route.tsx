import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/cms/constants";

// 1200×630 social card for /epr-calculator. Same treatment as the generated blog cards.
export function GET() {
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
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#CFE57A", letterSpacing: 1, textTransform: "uppercase" }}>
          E-Waste (Management) Rules, 2022
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>E-waste EPR target calculator</div>
          <div style={{ display: "flex", fontSize: 32, color: "#EEF5E6", maxWidth: 960, lineHeight: 1.35 }}>
            Recycling target and gold, copper, iron and aluminium obligations for all 106 EEE items.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 8, borderRadius: 4, background: "#B6D433" }} />
          <div style={{ display: "flex", fontSize: 30, color: "#EEF5E6" }}>Evergreen · {new URL(SITE_URL).host}</div>
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
