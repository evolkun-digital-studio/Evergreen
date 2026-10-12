import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { ConfirmBadge } from "@/components/Confirm";
import { site } from "@/config/site";
import { PageJsonLd } from "@/components/PageJsonLd";
import { pageMetadata } from "@/lib/seo/pages";

const title = "Group companies";
const description =
  "Evergreen is the authorised recycler in Sitapur. IndiaWMS is its group company in Lucknow for EPR credits and compliance, co-founded by Mr. Irfan Ahmad.";
const crumbs = [{ name: "Group companies", path: "/group-companies" }];

export const metadata = pageMetadata({ title, description, path: "/group-companies" });

export default function GroupCompaniesPage() {
  return (
    <>
      <PageJsonLd path="/group-companies" name={title} description={description} crumbs={crumbs} />
      <PageHeader
        title={title}
        lead={`${site.shortName} is the authorised recycler in ${site.address.locality}. ${site.groupCompanies[0].name} is its group company in ${site.groupCompanies[0].city} for EPR credits and compliance.`}
        crumbs={crumbs}
      />
      <section aria-label="Companies" className="section">
        <div className="container">
          <ul className="divide-y divide-line border-y border-line">
            <li className="grid gap-3 py-8 lg:grid-cols-12 lg:gap-x-12">
              <div className="lg:col-span-4">
                <h2>{site.shortName}</h2>
                <p className="meta mt-1 text-ink-muted">{site.address.locality}, Uttar Pradesh · PAN India pickup</p>
              </div>
              <p className="text-ink/85 lg:col-span-8">
                {site.legalName}. Authorised recycling of e-waste, batteries, plastics and industrial scrap, led by{" "}
                {site.owner.honorific} {site.owner.name}. This website.
              </p>
            </li>
            {site.groupCompanies.map(g => (
              <li key={g.url} className="grid gap-3 py-8 lg:grid-cols-12 lg:gap-x-12">
                <div className="lg:col-span-4">
                  <h2>{g.name}</h2>
                  <p className="meta mt-1 text-ink-muted">
                    {g.city}, Uttar Pradesh · {g.relationship}
                  </p>
                  <ConfirmBadge label="relationship wording" className="mt-2" />
                </div>
                <div className="lg:col-span-8">
                  <p className="text-ink/85">
                    {g.summary} {site.owner.honorific} {site.owner.name} is a co-founder.
                  </p>
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-link mt-4">
                    Visit {new URL(g.url).host}
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
