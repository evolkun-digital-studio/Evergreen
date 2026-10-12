import { SmoothScroll } from "@/components/SmoothScroll";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSiteSettings } from "@/lib/data/settings";
import { organizationNode, leadershipNodes, serializeJsonLd, websiteNode } from "@/lib/seo/jsonld";
import "./article.css";

// Site pages emit one merged graph per page (src/components/PageJsonLd.tsx); blog pages add their own
// Article/Collection graph, so the site-wide nodes are emitted here.
async function SiteJsonLd() {
  const settings = await getSiteSettings();
  const graph = { "@context": "https://schema.org", "@graph": [organizationNode(settings), ...leadershipNodes(), websiteNode()] };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }} />;
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SmoothScroll />
      <SiteJsonLd />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
