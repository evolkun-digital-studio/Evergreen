import { PageHeader } from "@/components/sections/PageHeader";
import { RelatedLinks } from "@/components/sections/Blocks";
import { PageJsonLd } from "@/components/PageJsonLd";
import { Photo } from "@/components/Photo";
import { library, stepPhotos } from "@/content/images";
import { steps } from "@/content/company";
import { SITE_URL } from "@/lib/cms/constants";
import { pageMetadata } from "@/lib/seo/pages";

const title = "Our recycling process";
const description =
  "How Evergreen handles e-waste, batteries and plastic in five documented steps: pickup request, collection, sorting, processing and a recycling certificate.";
const crumbs = [{ name: "Our process", path: "/process" }];

export const metadata = pageMetadata({ title: "Our E-Waste Recycling Process in 5 Steps", description, path: "/process" });

const howTo = {
  "@type": "HowTo",
  "@id": `${SITE_URL}/process#howto`,
  name: "How Evergreen recycles e-waste",
  description,
  step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body, url: `${SITE_URL}/process#step-${i + 1}` })),
};

export default function ProcessPage() {
  return (
    <>
      <PageJsonLd path="/process" name={title} description={description} crumbs={crumbs} image={library.yard} extra={[howTo]} />
      <PageHeader
        title={title}
        lead="Five steps, each documented, from your first call to the certificate you file for audits."
        crumbs={crumbs}
        photo={library.yard}
      />

      <section aria-labelledby="steps-heading" className="section">
        <div className="container">
          <h2 id="steps-heading" className="sr-only">
            The five steps
          </h2>
          <ol className="divide-y divide-line border-y border-line">
            {steps.map((s, i) => (
              <li key={s.title} id={`step-${i + 1}`} className="grid gap-6 py-10 lg:grid-cols-12 lg:items-center lg:gap-x-12">
                <Photo photo={stepPhotos[i]} ratio="4/3" sizes="(min-width: 1280px) 380px, (min-width: 1024px) 30vw, 92vw" className="lg:col-span-4" />
                <div className="lg:col-span-8">
                  <p className="meta text-copper-ink">Step {i + 1}</p>
                  <h3 className="mt-1 text-[var(--fs-h2)]">{s.title}</h3>
                  <p className="mt-3 max-w-[60ch] text-ink-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="process-related" className="section border-t border-line bg-paper-2">
        <div className="container">
          <h2 id="process-related" className="mb-10">
            Process by material
          </h2>
          <RelatedLinks
            links={[
              { href: "/services/e-waste-recycling", label: "E-waste recycling", note: "Dismantling, data destruction, recovery" },
              { href: "/services/battery-recycling", label: "Battery recycling", note: "Discharge, dismantling, black mass and lead" },
              { href: "/services/plastic-recycling", label: "Plastic recycling", note: "Sorting, shredding, washing, pelletising" },
              { href: "/epr-calculator", label: "EPR calculator", note: "Estimate your e-waste recycling target" },
            ]}
          />
        </div>
      </section>

    </>
  );
}
