import type { Metadata, Viewport } from "next";
import "./globals.css";
import { franie, manrope } from "./fonts";
import { SITE_URL } from "@/lib/cms/constants";
import { site } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${site.shortName}`,
    default: `E-waste, battery and plastic recycling in Sitapur, UP | ${site.shortName}`,
  },
  description: site.description,
  applicationName: site.shortName,
  openGraph: {
    type: "website",
    siteName: site.shortName,
    locale: "en_IN",
    images: [{ url: "/brand/og-default.png", width: 1200, height: 630, alt: `${site.name} logo` }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/og-default.png"],
  },
};

// No maximumScale: pinch-zoom must stay available (WCAG 1.4.4).
export const viewport: Viewport = {
  themeColor: "#0A2616",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} ${franie.variable} antialiased`}>{children}</body>
    </html>
  );
}
