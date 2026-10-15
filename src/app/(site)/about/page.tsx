import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { CapacityBand, EntityBlock } from "@/components/sections/Blocks";
import { PageJsonLd } from "@/components/PageJsonLd";
import { photos } from "@/content/images";
import { Leadership } from "@/components/sections/Leadership";
import { about } from "@/content/company";
import { fullAddress, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo/pages";

const title = "About Evergreen";
const description = `Ever Green E-Waste Recycling Management is an authorised recycler in Sitapur, Uttar Pradesh, founded in ${site.founded} by Mr. Irfan Ahmad, with PAN India pickup.`;
const crumbs = [{ name: "About", path: "/about" }];

export const metadata = pageMetadata({
  title: "About Evergreen, Authorised Recycler in Sitapur",
  description,
  path: "/about",
});

export default function AboutPage() {
  const group = site.groupCompanies[0];
  return (
    <>
      <PageJsonLd
        path="/about"
        name={title}
        description={description}
        type="AboutPage"
        crumbs={crumbs}
        image={photos.about}
      />
      <PageHeader
        title={title}
        lead={`An authorised recycling company in ${site.address.locality}, ${site.address.region}, collecting from client locations across India.`}
        crumbs={crumbs}
        photo={photos.about}
      />

      <section aria-labelledby="work-heading" className="section">
        <div className="container grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <h2 id="work-heading" className="lg:col-span-4">
            Recycling in Sitapur since {site.founded}
          </h2>
          <div className="space-y-4 text-ink/85 lg:col-span-8">
            {about.paragraphs.map(p => (
              <p key={p.body} className="text-[18px]">
                {p.lead && (
                  <strong className="font-semibold text-ink">{p.lead}</strong>
                )}
                {p.lead && " "}
                {p.body}
              </p>
            ))}
            <p>Our plant is at {fullAddress()}.</p>
            <ul className="grid gap-4 pt-4 sm:grid-cols-2">
              {about.highlights.map((h, i) => (
                <li
                  key={h.title}
                  className={`rounded-lg border border-line bg-paper-2 p-5 ${i === about.highlights.length - 1 ? "sm:col-span-2" : ""}`}
                >
                  <h3 className="text-lg font-semibold text-ink">{h.title}</h3>
                  <p className="mt-1 text-[15px] text-ink-muted">{h.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CapacityBand className="border-y border-line" />

      <Leadership>
        <p className="mx-auto mt-10 max-w-[712px] border-t border-line pt-5 text-[15px] leading-relaxed text-ink-muted">
          {site.owner.honorific} {site.owner.name} is also a co-founder of{" "}
          {group.name}, a {group.city}-based company that works on EPR credits
          and compliance.{" "}
          <Link
            href="/group-companies"
            className="text-link inline-flex min-h-11 items-center"
          >
            Group companies
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </p>
      </Leadership>

      <EntityBlock />
    </>
  );
}
