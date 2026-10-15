import { SITE_URL } from "@/lib/cms/constants";
import type { SiteSettingsData } from "@/lib/cms/defaults";
import { site } from "@/config/site";
import { services } from "@/content/services";
import { leadership, type Leader } from "@/content/company";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
const personId = (l: Leader) => `${SITE_URL}/about#${l.id}`;

/** Serialises JSON-LD for a <script> tag; escaping `<` prevents `</script>` breakouts. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const compact = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) =>
        v !== "" &&
        v !== null &&
        v !== undefined &&
        !(Array.isArray(v) && !v.length)
    )
  ) as Partial<T>;

export function organizationNode(settings: SiteSettingsData) {
  const org = settings.organization;
  const address = compact({
    "@type": "PostalAddress",
    streetAddress: site.address.street,
    addressLocality: site.address.locality,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  });
  return compact({
    "@type": ["Organization", "LocalBusiness", "RecyclingCenter"],
    "@id": ORGANIZATION_ID,
    name: site.name,
    legalName: site.legalName,
    url: site.domain,
    description: site.description,
    logo: org.logo
      ? { "@type": "ImageObject", "@id": `${SITE_URL}/#logo`, url: org.logo }
      : undefined,
    image: org.logo || undefined,
    email: site.email,
    telephone: site.phone,
    address: Object.keys(address).length > 1 ? address : undefined,
    taxID: site.gstin,
    vatID: site.gstin,
    foundingDate: site.founded,
    areaServed: { "@type": "Country", name: site.areaServed },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    hasMap: site.mapsUrl,
    knowsAbout: [
      "E-waste recycling",
      "Battery recycling",
      "Lithium-ion battery recycling",
      "Lead-acid battery recycling",
      "Plastic recycling",
      "Metal recovery",
      "Secure data destruction",
      "Extended Producer Responsibility (EPR)",
      "E-Waste (Management) Rules, 2022",
      "Battery Waste Management Rules, 2022",
      "CPCB compliance",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: site.phone,
        email: site.email,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      },
      {
        "@type": "ContactPoint",
        telephone: site.alternatePhone,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      },
      {
        "@type": "ContactPoint",
        telephone: site.businessContact.phone,
        contactType: "sales",
        name: `Business enquiries (${site.businessContact.name})`,
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      },
    ],
    founder: leadership
      .filter(l => l.founder)
      .map(l => ({ "@id": personId(l) })),
    employee: leadership.map(l => ({ "@id": personId(l) })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Recycling services",
      itemListElement: services.map(s => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          "@id": `${SITE_URL}/services/${s.slug}#service`,
          name: s.title,
          description: s.summary,
          url: `${SITE_URL}/services/${s.slug}`,
        },
      })),
    },
    sameAs: org.sameAs,
  });
}

/** One Person node per leader, with the same names and titles as the /about page. */
export function leadershipNodes() {
  return leadership.map(l =>
    compact({
      "@type": "Person",
      "@id": personId(l),
      name: l.name,
      honorificPrefix: l.honorific,
      jobTitle: l.role,
      image: l.portrait
        ? {
            "@type": "ImageObject",
            url: `${SITE_URL}${l.portrait.src.src}`,
            width: l.portrait.src.width,
            height: l.portrait.src.height,
            caption: l.portrait.alt,
          }
        : undefined,
      worksFor: { "@id": ORGANIZATION_ID },
      affiliation: l.founder
        ? site.groupCompanies.map(g => ({
            "@type": "Organization",
            "@id": g.id,
            name: g.name,
            url: g.url,
          }))
        : undefined,
    })
  );
}

export function websiteNode() {
  return compact({
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: site.name,
    description: site.description,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en-IN",
  });
}
