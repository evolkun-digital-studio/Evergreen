import { SITE_URL } from "./constants";
import { sameAs, site } from "@/config/site";

/**
 * Fallback site settings. Used to seed the SiteSettings singleton and whenever the
 * database is unreachable (e.g. a build without MONGODB_URI), so public pages keep
 * rendering the same Organization data the site shipped with.
 */
export const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /blog/preview
Disallow: /documents
Disallow: /api/documents
`;

export const DEFAULT_SETTINGS = {
  siteTitle: site.legalName,
  tagline: "E-waste, battery and plastic recycling in Sitapur, Uttar Pradesh",
  logoUrl: `${SITE_URL}${site.logo}`,
  faviconUrl: "",
  defaultOgImageUrl: `${SITE_URL}/brand/og-default.png`,
  organization: {
    name: site.name,
    legalName: site.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/evergreen-512.png`,
    description:
      site.description,
    address: {
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    phone: site.phone,
    email: site.email,
    sameAs: sameAs(),
  },
  ga4Id: "",
  gtmId: "",
  clarityId: "",
  metaPixelId: "",
  gscVerification: "",
  bingVerification: "",
  cookieConsentEnabled: false,
  robotsTxt: DEFAULT_ROBOTS_TXT,
  defaultRobotsIndex: true,
  defaultRobotsFollow: true,
  postsPerPage: 12,
  titleTemplate: "%s | Ever Green",
  indexNowEnabled: true,
  googleIndexingEnabled: false,
  blockPublishBelowScore: 0,
};

export type SiteSettingsData = typeof DEFAULT_SETTINGS & {
  logoId?: string | null;
  faviconId?: string | null;
  defaultOgImageId?: string | null;
};
