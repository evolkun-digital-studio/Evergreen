import { PageHeader } from "@/components/sections/PageHeader";
import { EprCalculator } from "@/components/epr/EprCalculator";
import { eprFaq } from "@/content/epr-faq";
import { eprData } from "@/lib/epr/data";
import { DISCLAIMER } from "@/lib/epr/summary";
import { FaqSection, RelatedLinks } from "@/components/sections/Blocks";
import { PageJsonLd } from "@/components/PageJsonLd";
import { SITE_URL } from "@/lib/cms/constants";
import { ORGANIZATION_ID } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/pages";

const path = "/epr-calculator";
const title = "E-waste EPR calculator";
const lead = "Estimate your annual e-waste recycling target and metal recovery obligation under the E-Waste (Management) Rules, 2022.";
const description =
  "Free calculator for producers: estimate your e-waste EPR recycling target and gold, copper, iron and aluminium obligations under the E-Waste Rules, 2022.";
const crumbs = [{ name: "EPR calculator", path }];

export const metadata = pageMetadata({
  title: "E-Waste EPR Target Calculator (E-Waste Rules 2022)",
  description,
  path,
  absoluteTitle: true,
  image: { url: "/og/epr-calculator", alt: "E-waste EPR target calculator by Evergreen" },
});

const url = `${SITE_URL}${path}`;
const appNodes = [
    {
      "@type": "WebApplication",
      "@id": `${url}#app`,
      name: "E-waste EPR target calculator",
      url,
      description: lead,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (web browser)",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      provider: { "@id": ORGANIZATION_ID },
    },
];

const fmtDate = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : d;

export default function EprCalculatorPage() {
  const sources = eprData.meta.sources.filter(s => s.key !== "portalFaq");
  return (
    <>
      <PageJsonLd path={path} name={title} description={description} crumbs={crumbs} faq={eprFaq} extra={appNodes} />
      <PageHeader title={title} lead={lead} crumbs={crumbs} />

      <section aria-label="Calculator" className="section bg-paper-2 pt-10 lg:pt-14">
        <div className="container">
          <EprCalculator />
        </div>
      </section>

      <FaqSection id="epr-faq-heading" title="Questions about EPR targets" items={eprFaq} />

      <section aria-labelledby="epr-related-heading" className="section border-t border-line">
        <div className="container">
          <h2 id="epr-related-heading" className="mb-10">
            Meet your target with a registered recycler
          </h2>
          <RelatedLinks
            links={[
              { href: "/services/e-waste-recycling", label: "E-waste recycling", note: "Recycling certificates and EPR support" },
              { href: "/services/metal-recovery", label: "Metal recovery", note: "Copper, aluminium, gold and silver" },
              { href: "/services/battery-recycling", label: "Battery recycling", note: "Lithium-ion and lead-acid" },
              { href: "/contact", label: "Talk to us", note: "Business enquiries and pickups" },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="epr-sources-heading" className="border-t border-line bg-paper-2 py-12">
        <div className="container text-[14px] leading-relaxed text-ink-muted">
          <h2 id="epr-sources-heading" className="text-[1.0625rem]">
            Sources and disclaimer
          </h2>
          <ul className="mt-4 max-w-4xl space-y-2">
            {sources.map(s => (
              <li key={s.key}>
                {s.issuer},{" "}
                <a href={s.url} className="font-medium text-evergreen-700 underline decoration-evergreen-700/30 underline-offset-2 hover:decoration-evergreen-700" target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>{" "}
                ({fmtDate(s.date)}). <span className="text-ink-muted">{s.usedFor}.</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-4xl">
            Data extracted from these documents on {fmtDate(eprData.meta.extractedAt)}. Average-life figures marked “draft” come from CPCB&apos;s draft list
            of 21 March 2023; no final list had been published.
          </p>
          <p className="mt-4 font-semibold text-ink">{DISCLAIMER}</p>
        </div>
      </section>
    </>
  );
}
