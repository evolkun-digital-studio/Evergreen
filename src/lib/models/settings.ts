import "server-only";
import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose";
import { DEFAULT_SETTINGS } from "@/lib/cms/defaults";

const { Schema, model, models } = mongoose;

const d = DEFAULT_SETTINGS;

const SiteSettingsSchema = new Schema(
  {
    /** Singleton key; there is exactly one document with key "site". */
    key: { type: String, default: "site" },
    siteTitle: { type: String, default: d.siteTitle },
    tagline: { type: String, default: d.tagline },
    logoId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    logoUrl: { type: String, default: d.logoUrl },
    faviconId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    faviconUrl: { type: String, default: "" },
    defaultOgImageId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    defaultOgImageUrl: { type: String, default: "" },
    organization: {
      name: { type: String, default: d.organization.name },
      legalName: { type: String, default: d.organization.legalName },
      url: { type: String, default: d.organization.url },
      logo: { type: String, default: d.organization.logo },
      description: { type: String, default: d.organization.description },
      address: {
        streetAddress: { type: String, default: "" },
        addressLocality: { type: String, default: d.organization.address.addressLocality },
        addressRegion: { type: String, default: d.organization.address.addressRegion },
        postalCode: { type: String, default: d.organization.address.postalCode },
        addressCountry: { type: String, default: d.organization.address.addressCountry },
      },
      phone: { type: String, default: d.organization.phone },
      email: { type: String, default: d.organization.email },
      sameAs: { type: [String], default: [] },
    },
    ga4Id: { type: String, default: "" },
    gtmId: { type: String, default: "" },
    clarityId: { type: String, default: "" },
    metaPixelId: { type: String, default: "" },
    gscVerification: { type: String, default: "" },
    bingVerification: { type: String, default: "" },
    cookieConsentEnabled: { type: Boolean, default: false },
    robotsTxt: { type: String, default: d.robotsTxt },
    defaultRobotsIndex: { type: Boolean, default: true },
    defaultRobotsFollow: { type: Boolean, default: true },
    postsPerPage: { type: Number, default: d.postsPerPage, min: 1, max: 50 },
    titleTemplate: { type: String, default: d.titleTemplate },
    indexNowEnabled: { type: Boolean, default: true },
    googleIndexingEnabled: { type: Boolean, default: false },
    blockPublishBelowScore: { type: Number, default: 0, min: 0, max: 100 },
    notificationEmails: { type: [String], default: [] },
  },
  { timestamps: true, minimize: false },
);
SiteSettingsSchema.index({ key: 1 }, { unique: true });

export type SiteSettingsDoc = InferSchemaType<typeof SiteSettingsSchema> & { _id: Types.ObjectId };
export const SiteSettings: Model<SiteSettingsDoc> =
  (models.SiteSettings as Model<SiteSettingsDoc>) || model<SiteSettingsDoc>("SiteSettings", SiteSettingsSchema);
