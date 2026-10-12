/**
 * Company facts. Single source for components, metadata and JSON-LD.
 * Source: evergreenrecycler.in (reference/evergreenrecycler-content.txt).
 * Values set to CONFIRM are hidden from the public UI, including development previews.
 */
export const CONFIRM = "CONFIRM" as const;

export const site = {
  name: "Evergreen",
  shortName: "Evergreen",
  legalName: "Ever Green E-Waste Recycling Management",
  domain: "https://evergreenrecycler.in",
  description:
    "Authorised e-waste, battery and plastic recycler in Sitapur, Uttar Pradesh, since 2021. PAN India pickup, recycling certificates, EPR and CPCB compliance support.",
  logo: "/brand/evergreen-logo.png",
  // Local copy of the supplied PNG, shared by every logo placement.
  logoSource: "https://ik.imagekit.io/rxoyjxx4c/Asset%2058@4x.png",
  founded: "2021",
  owner: { name: "Irfan Ahmad", honorific: "Mr.", role: "Owner" },
  /** Business enquiries (source: Evergreen outreach material). Title not yet confirmed: shown without one. */
  businessContact: {
    name: "Mukul Agarwal",
    honorific: "Mr.",
    title: CONFIRM as string,
    phone: "+91 95577 86553",
    whatsapp: "919557786553",
  },
  phone: "+91 94150 46061",
  phoneConfirmed: true,
  whatsapp: "919415046061",
  whatsappConfirmed: true,
  // Gmail for now; switch to a domain address (e.g. info@evergreenrecycler.in) once it exists.
  email: "evergreenewaste2021@gmail.com",
  gstin: "09BQEPA3569F3ZV",
  address: {
    street: "Rampur Mathura, Mahmudabad",
    locality: "Sitapur",
    region: "Uttar Pradesh",
    postalCode: "261204",
    country: "IN",
  },
  mapsUrl: "https://maps.google.com/?q=Mahmudabad,Sitapur,Uttar+Pradesh",
  /** Approximate (Mahmudabad town centre, Sitapur district). Replace with the plant's exact pin when confirmed. */
  geo: { latitude: 27.2955, longitude: 81.1167 },
  /** PAN India pickup from client locations; the plant itself is in Sitapur, UP. */
  areaServed: "India",
  plantLocation: "Sitapur, Uttar Pradesh",
  // The source does not state the legal relationship; "group company" until confirmed.
  groupCompanies: [
    {
      name: "IndiaWMS",
      url: "https://indiawms.in",
      id: "https://indiawms.in/#organization",
      city: "Lucknow",
      relationship: "Group company",
      summary: "EPR credits and EPR compliance for producers, importers and brand owners.",
    },
  ],
  social: {
    linkedin: CONFIRM as string,
    instagram: CONFIRM as string,
    x: CONFIRM as string,
  },
};

export function isSet(value: string | undefined | null): value is string {
  return !!value && value !== CONFIRM;
}

export const isProduction = process.env.NODE_ENV === "production";

export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || site.domain).replace(/\/+$/, "");

export const publicPhone = site.phoneConfirmed || !isProduction ? site.phone : null;
export const publicWhatsapp = site.whatsappConfirmed || !isProduction ? site.whatsapp : null;

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
/** Default prefilled WhatsApp message, so every chat link opens with context. */
export const WA_DEFAULT_TEXT = "Hello Evergreen, I would like to request a pickup.";
export const waHref = (number: string, text: string = WA_DEFAULT_TEXT) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
export const mailHref = (subject = "Enquiry from evergreenrecycler.in") =>
  `mailto:${site.email}?subject=${encodeURIComponent(subject)}`;

export const fullAddress = () => {
  const a = site.address;
  return `${a.street}, ${a.locality}, ${a.region} ${a.postalCode}`;
};

export const sameAs = () => Object.values(site.social).filter(isSet);
