// Which schema.org types a post generates. Pure and client-safe: the editor's Schema tab shows
// this list live, and the JSON-LD builder uses the same rules.

type SchemaDetectionInput = {
  contentType: string;
  faqCount: number;
  howToStepCount: number;
  hasVideo: boolean;
  breadcrumbEnabled: boolean;
  speakableEnabled: boolean;
  hasReviewer: boolean;
  review: { itemName: string; ratingValue: number | null } | null;
  product: { name: string } | null;
};

type DetectedSchema = { type: string; reason: string; note?: string };

export function detectSchemaTypes(i: SchemaDetectionInput): DetectedSchema[] {
  const out: DetectedSchema[] = [
    { type: "Organization", reason: "Always (from Site Settings)" },
    { type: "WebSite", reason: "Always" },
    { type: "WebPage", reason: "Always" },
    { type: "BlogPosting", reason: "Always" },
    { type: i.hasReviewer ? "Person (author + reviewer)" : "Person (author)", reason: "Always" },
    { type: "ImageObject", reason: "Featured and content images" },
  ];
  if (i.breadcrumbEnabled) out.push({ type: "BreadcrumbList", reason: "Breadcrumbs enabled" });
  if (i.faqCount > 0) {
    out.push({
      type: "FAQPage",
      reason: `${i.faqCount} FAQ${i.faqCount > 1 ? "s" : ""}`,
      note: "Google shows FAQ rich results only for well-known government and health sites; the markup still helps AI and other engines.",
    });
  }
  if (i.contentType === "HowTo" && i.howToStepCount > 0) {
    out.push({ type: "HowTo", reason: `${i.howToStepCount} steps`, note: "Google has deprecated HowTo rich results; other engines and AI assistants still read it." });
  }
  if (i.hasVideo) out.push({ type: "VideoObject", reason: "Video attached or embedded" });
  if ((i.contentType === "Review" || i.contentType === "ProductReview") && i.review?.itemName) {
    out.push({
      type: "Review",
      reason: i.review.ratingValue !== null ? "Review with rating" : "Review (no rating: none is invented)",
    });
    if (i.contentType === "ProductReview" && i.product?.name) out.push({ type: "Product", reason: "Product review" });
  }
  if (i.speakableEnabled) out.push({ type: "SpeakableSpecification", reason: "Speakable enabled", note: "Speakable is a limited beta in Google." });
  return out;
}
