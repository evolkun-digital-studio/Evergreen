import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { CapacityNote, FaqSection, RelatedLinks, SectionHead, SourceList, Workflow } from "@/components/sections/Blocks";
import { ConfirmBadge } from "@/components/Confirm";
import { PageJsonLd } from "@/components/PageJsonLd";
import { Photo } from "@/components/Photo";
import { servicePhotos } from "@/content/images";
import { getService, services } from "@/content/services";
import { capacityFor } from "@/content/stats";
import { site } from "@/config/site";
import { ORGANIZATION_ID } from "@/lib/seo/jsonld";
import { pageMetadata, pageUrl } from "@/lib/seo/pages";

export function generateStaticParams() {
  return services.map(s => ({ slug: s.slug }));
}

export async function generateMetadata(props: PageProps<"/services/[slug]">) {
  const { slug } = await props.params;
  const s = getService(slug);
  if (!s) return {};
  return pageMetadata({ title: s.metaTitle, description: s.metaDescription, path: `/services/${s.slug}`, absoluteTitle: true });
}

/**
 * One template for all six services: header (16:9 photo + H1 + lead) → What we accept → How we process it
 * → What you receive → FAQ → related links → CTA.
 */
export default async function ServicePage(props: PageProps<"/services/[slug]">) {
  const { slug } = await props.params;
  const s = getService(slug);
  if (!s) notFound();
  const path = `/services/${s.slug}`;
  const url = pageUrl(path);
  const photo = servicePhotos[s.slug];
  const cap = capacityFor(s.slug);
  const crumbs = [
    { name: "Services", path: "/services" },
    { name: s.title, path },
  ];
  const related = s.related.map(r => getService(r)!).filter(Boolean);
  const serviceNode = {
    "@type": "Service",
    "@id": `${url}#service`,
    name: s.title,
    description: s.lead,
    serviceType: s.title,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: site.areaServed },
    url,
    image: { "@id": `${url}#primaryimage` },
    mainEntityOfPage: { "@id": `${url}#webpage` },
  };
  const photoAccepts = s.accepts.filter(a => a.photo);
  const textAccepts = s.accepts.filter(a => !a.photo);

  return (
    <>
      <PageJsonLd path={path} name={s.title} description={s.metaDescription} crumbs={crumbs} image={photo} faq={s.faq} extra={[serviceNode]} />
      <PageHeader title={s.title} lead={s.lead} crumbs={crumbs} photo={photo}>
        {cap && <CapacityNote material={cap.material} tonnes={cap.tonnes} />}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/contact" className="btn btn-primary">
            Request a free pickup
          </Link>
          <Link href="/epr-calculator" className="btn btn-secondary">
            Calculate your EPR target
          </Link>
        </div>
      </PageHeader>

      <section aria-labelledby="accepts-heading" className="section">
        <div className="container grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-4">
            <h2 id="accepts-heading">What we accept</h2>
            {s.definition && (
              <p className="mt-4 text-ink-muted">
                <dfn className="font-semibold not-italic text-ink">{s.definition.term}</dfn>
                {s.definition.text.slice(s.definition.term.length)}
              </p>
            )}
            {s.confirm?.map(c => <ConfirmBadge key={c} label={c} className="mt-4" />)}
          </div>
          <div className="lg:col-span-8">
            {photoAccepts.length > 0 && (
              <ul className="mb-8 grid gap-6 sm:grid-cols-2">
                {photoAccepts.map(a => (
                  <li key={a.name}>
                    <Photo photo={a.photo!} ratio="4/3" sizes="(min-width: 1280px) 380px, (min-width: 640px) 45vw, 92vw" />
                    <h3 className="mt-4">{a.name}</h3>
                    <p className="mt-1 text-ink-muted">{a.detail}</p>
                  </li>
                ))}
              </ul>
            )}
            {textAccepts.length > 0 && (
              <ul className="divide-y divide-line border-y border-line">
                {textAccepts.map(a => (
                  <li key={a.name} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-6">
                    <span className="flex gap-3 font-semibold text-evergreen-950">
                      <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-evergreen-700" />
                      {a.name}
                    </span>
                    <span className="pl-7 text-ink-muted sm:pl-0">{a.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="process-heading" className="section border-t border-line bg-paper-2">
        <div className="container">
          <SectionHead id="process-heading" title="How we process it" link={{ href: "/process", label: "Our recycling process" }} />
          <Workflow steps={s.workflow} />
          <ConfirmBadge label="process steps in-house vs partners (stats.ts process-steps)" className="mt-6" />
        </div>
      </section>

      <section aria-labelledby="receive-heading" className="section">
        <div className="container grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <h2 id="receive-heading" className="lg:col-span-4">
            What you receive
          </h2>
          <div className="lg:col-span-8">
            <ul className="divide-y divide-line border-y border-line">
              {s.receives.map(r => (
                <li key={r} className="flex gap-3 py-4">
                  <FileCheck2 aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-evergreen-700" />
                  {r}
                </li>
              ))}
            </ul>
            <SourceList items={s.sources} className="mt-8" />
          </div>
        </div>
      </section>

      <FaqSection id="faq-heading" title="Questions" items={s.faq} />

      <section aria-labelledby="related-heading" className="section border-t border-line">
        <div className="container">
          <SectionHead id="related-heading" title="Related" />
          <RelatedLinks
            links={[
              ...related.map(r => ({ href: `/services/${r.slug}`, label: r.title, note: r.summary })),
              { href: "/epr-calculator", label: "EPR calculator", note: "Estimate your e-waste recycling target" },
              { href: "/process", label: "Our recycling process", note: "Five steps from pickup to certificate" },
            ]}
          />
        </div>
      </section>

    </>
  );
}
