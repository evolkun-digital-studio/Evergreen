import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { SustainabilityBand } from "@/components/home/SustainabilityBand";
import { ServiceList } from "@/components/sections/ServiceList";
import { StatsRow } from "@/components/sections/StatsRow";
import { Registrations } from "@/components/sections/Registrations";
import { Industries } from "@/components/sections/Industries";
import { CapacityBand, EntityBlock, MaterialsStrip, SectionHead, Workflow } from "@/components/sections/Blocks";
import { PageJsonLd } from "@/components/PageJsonLd";
import { Photo } from "@/components/Photo";
import { industryPhotos, photos, stepPhotos } from "@/content/images";
import { about, steps } from "@/content/company";
import { stats } from "@/content/stats";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo/pages";

const title = "E-Waste, Battery and Plastic Recycler in Sitapur | Evergreen";
const description =
  "Authorised e-waste, battery and plastic recycler in Sitapur, UP. PAN India pickup, recycling certificates, data destruction and EPR compliance support.";

export const metadata = pageMetadata({ title, description, path: "/", absoluteTitle: true });

export default function Home() {
  return (
    <>
      <PageJsonLd path="/" name={site.name} description={description} />
      <Hero />

      <section aria-labelledby="about-heading" className="section border-y border-line">
        <div className="container grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">About {site.shortName}</p>
            <h2 id="about-heading" className="mt-4">
              Recycling in Sitapur since {site.founded}
            </h2>
            <Photo
              photo={photos.about}
              ratio="4/3"
              sizes="(min-width: 1280px) 480px, (min-width: 1024px) 38vw, 92vw"
              className="mt-8"
            />
          </div>
          <div className="lg:col-span-7 lg:pt-12">
            {about.paragraphs.map(p => (
              <p key={p} className="mt-5 text-[1.0625rem] leading-[1.7] text-ink/90 first:mt-0 lg:text-[1.125rem]">
                {p}
              </p>
            ))}
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-8 text-[15px] font-medium text-ink-muted sm:grid-cols-3">
              {about.capabilities.map(c => (
                <li key={c} className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-evergreen-600/70" />
                  {c}
                </li>
              ))}
            </ul>
            <Link href="/about" className="text-link mt-8 min-h-11">
              About us
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="services-heading" className="section bg-paper-2">
        <div className="container">
          <SectionHead id="services-heading" title="What we recycle" link={{ href: "/services", label: "All services" }} />
          <ServiceList />
        </div>
      </section>

      <section aria-labelledby="materials-heading" className="section">
        <div className="container">
          <SectionHead
            id="materials-heading"
            title="Materials we recover"
            lead="Recovered material goes back into manufacturing instead of landfill."
            link={{ href: "/services/metal-recovery", label: "Metal recovery" }}
          />
          <MaterialsStrip />
        </div>
      </section>

      <CapacityBand className="border-y border-line">
        <div className="pt-6">
          <h3 className="sr-only">Key figures</h3>
          <StatsRow items={stats} />
        </div>
      </CapacityBand>

      <section aria-labelledby="process-heading" className="section border-t border-line">
        <div className="container">
          <SectionHead
            id="process-heading"
            title="How a pickup works"
            lead="Five steps from your request to a recycling certificate."
            link={{ href: "/process", label: "Our recycling process" }}
          />
          <Workflow steps={steps.map((s, i) => ({ title: s.title, caption: s.short, photo: stepPhotos[i] }))} />
        </div>
      </section>

      <section aria-labelledby="certs-heading" className="section bg-paper-2">
        <div className="container grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-4">
            <h2 id="certs-heading">Registrations and authorisations</h2>
            <p className="mt-4 text-ink-muted">The registrations under which we collect, process and certify. Copies on request.</p>
            <Link href="/certifications" className="text-link mt-6 min-h-11">
              Certifications
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="lg:col-span-8">
            <Registrations />
          </div>
        </div>
      </section>

      <section aria-labelledby="industries-heading" className="section">
        <div className="container">
          <SectionHead id="industries-heading" title="Industries we serve" />
          <ul className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:mb-12">
            {industryPhotos.map(photo => (
              <li key={photo.alt}>
                <Photo photo={photo} ratio="4/3" sizes="(min-width: 1280px) 290px, (min-width: 640px) 23vw, 46vw" />
              </li>
            ))}
          </ul>
          <Industries />
        </div>
      </section>

      <SustainabilityBand />

      <EntityBlock className="border-t-0" />

    </>
  );
}
