import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Enter a full URL starting with https://");

const trackingId = (pattern: RegExp, example: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || pattern.test(v), `Expected an ID like ${example}`);

export const settingsSchema = z.object({
  siteTitle: z.string().trim().min(1, "Required").max(80),
  tagline: z.string().trim().max(160),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  defaultOgImageUrl: optionalUrl,
  titleTemplate: z
    .string()
    .trim()
    .refine((v) => v.includes("%s"), "Must contain %s where the page title goes"),
  postsPerPage: z.coerce.number().int().min(1).max(50),
  organization: z.object({
    name: z.string().trim().min(1, "Required"),
    legalName: z.string().trim(),
    url: optionalUrl,
    logo: optionalUrl,
    description: z.string().trim().max(500),
    address: z.object({
      streetAddress: z.string().trim(),
      addressLocality: z.string().trim(),
      addressRegion: z.string().trim(),
      postalCode: z.string().trim(),
      addressCountry: z.string().trim().max(2, "Use the 2-letter ISO code, e.g. IN"),
    }),
    phone: z.string().trim(),
    email: z.union([z.literal(""), z.string().trim().email()]),
    sameAs: z.array(z.string().trim().url("Each profile must be a full URL")),
  }),
  ga4Id: trackingId(/^G-[A-Z0-9]+$/i, "G-XXXXXXXXXX"),
  gtmId: trackingId(/^GTM-[A-Z0-9]+$/i, "GTM-XXXXXXX"),
  clarityId: trackingId(/^[a-z0-9]+$/i, "abcd1234ef"),
  metaPixelId: trackingId(/^\d+$/, "123456789012345"),
  gscVerification: z.string().trim().max(200),
  bingVerification: z.string().trim().max(200),
  cookieConsentEnabled: z.boolean(),
  defaultRobotsIndex: z.boolean(),
  defaultRobotsFollow: z.boolean(),
  indexNowEnabled: z.boolean(),
  googleIndexingEnabled: z.boolean(),
  blockPublishBelowScore: z.coerce.number().int().min(0).max(100),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
