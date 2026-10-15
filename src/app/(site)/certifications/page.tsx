import { PageHeader } from "@/components/sections/PageHeader";
import { Registrations } from "@/components/sections/Registrations";
import { SourceList } from "@/components/sections/Blocks";
import { PageJsonLd } from "@/components/PageJsonLd";
import { photos } from "@/content/images";
import { sources } from "@/content/services";
import { mailHref, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo/pages";

const title = "Certifications and registrations";
const description =
  "Evergreen's company profile lists UPPCB consents and EPR registrations for e-waste, batteries and plastics, hazardous-waste authorisation, GST, MSME and ISO certifications.";
const crumbs = [{ name: "Certifications", path: "/certifications" }];

export const metadata = pageMetadata({
  title: "Evergreen Authorisations, Registrations and ISO Certifications",
  description,
  path: "/certifications",
});

export default function CertificationsPage() {
  return (
    <>
      <PageJsonLd
        path="/certifications"
        name={title}
        description={description}
        crumbs={crumbs}
        image={photos.certs}
      />
      <PageHeader
        title={title}
        lead={`The registrations and authorisations under which ${site.legalName} operates.`}
        crumbs={crumbs}
        photo={photos.certs}
      />
      <section aria-labelledby="registrations-heading" className="section">
        <div className="container grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-4">
            <h2 id="registrations-heading">Registrations</h2>
            <p className="mt-4 text-ink/85">
              For details of any registration, write to{" "}
              <a
                href={mailHref("Registration details")}
                className="break-all font-semibold text-evergreen-700 underline underline-offset-4"
              >
                {site.email}
              </a>
              .
            </p>
            <SourceList
              items={[
                sources.eWasteRules,
                sources.batteryRules,
                sources.eWastePortal,
              ]}
              className="mt-8"
            />
          </div>
          <div className="lg:col-span-8">
            <Registrations />
          </div>
        </div>
      </section>
    </>
  );
}
