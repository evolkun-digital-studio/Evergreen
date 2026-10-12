import { PageHeader } from "@/components/sections/PageHeader";
import { ServiceList } from "@/components/sections/ServiceList";
import { CapacityBand } from "@/components/sections/Blocks";
import { PageJsonLd } from "@/components/PageJsonLd";
import { services } from "@/content/services";
import { SITE_URL } from "@/lib/cms/constants";
import { pageMetadata } from "@/lib/seo/pages";

const title = "Recycling services";
const description =
  "E-waste, battery and plastic recycling, metal recovery, industrial scrap and secure disposal from our authorised plant in Sitapur, UP, with PAN India pickup.";
const crumbs = [{ name: "Services", path: "/services" }];

export const metadata = pageMetadata({ title: "Recycling Services in Sitapur, UP | PAN India", description, path: "/services", absoluteTitle: true });

const list = {
  "@type": "ItemList",
  "@id": `${SITE_URL}/services#list`,
  itemListElement: services.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/services/${s.slug}`, name: s.title })),
};

export default function ServicesPage() {
  return (
    <>
      <PageJsonLd path="/services" name={title} description={description} type="CollectionPage" crumbs={crumbs} extra={[list]} />
      <PageHeader
        title={title}
        lead="Six services, all run from our plant in Sitapur, with pickup from client locations across India. Every job ends with a recycling certificate."
        crumbs={crumbs}
      />
      <section aria-labelledby="services-list-heading" className="section bg-paper-2">
        <div className="container">
          <h2 id="services-list-heading" className="sr-only">
            All services
          </h2>
          <ServiceList />
        </div>
      </section>
      <CapacityBand className="border-t border-line bg-paper" />
    </>
  );
}
