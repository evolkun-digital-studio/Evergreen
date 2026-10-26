import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDB, isDbConfigured } from "@/lib/db";
import { SiteSettings } from "@/lib/models";
import { DEFAULT_SETTINGS, type SiteSettingsData } from "@/lib/cms/defaults";
import { TAGS } from "@/lib/cache-tags";
import { serialize } from "@/lib/serialize";
import { logServerError } from "@/lib/log";
import { resolveNotificationRecipients } from "@/lib/notifications";

/** Uncached read for the admin Settings screen. */
export async function readSiteSettings(): Promise<SiteSettingsData> {
  await connectDB();
  const doc = await SiteSettings.findOne({ key: "site" }).lean();
  return mergeSettings(doc ? serialize(doc) : null);
}

/** Who to email about new document requests and enquiries: admin Settings first, ENQUIRY_EMAIL_TO as the fallback. */
export async function getNotificationRecipients(): Promise<string[]> {
  let fromSettings: string[] = [];
  try {
    fromSettings = (await readSiteSettings()).notificationEmails ?? [];
  } catch (error) {
    logServerError("[notifications] settings unavailable, using ENQUIRY_EMAIL_TO", error);
  }
  return resolveNotificationRecipients(fromSettings, process.env.ENQUIRY_EMAIL_TO);
}

/** Cached read for public pages; invalidated with the "settings" tag. */
export async function getSiteSettings(): Promise<SiteSettingsData> {
  "use cache";
  cacheTag(TAGS.settings);

  if (!isDbConfigured()) {
    cacheLife("hours");
    return DEFAULT_SETTINGS;
  }
  try {
    const settings = await readSiteSettings();
    cacheLife("max");
    return settings;
  } catch (error) {
    logServerError("[settings] falling back to defaults", error);
    cacheLife("hours");
    return DEFAULT_SETTINGS;
  }
}

function mergeSettings(doc: Record<string, unknown> | null): SiteSettingsData {
  if (!doc) return DEFAULT_SETTINGS;
  const org = (doc.organization ?? {}) as Partial<SiteSettingsData["organization"]>;
  return {
    ...DEFAULT_SETTINGS,
    ...(doc as Partial<SiteSettingsData>),
    organization: {
      ...DEFAULT_SETTINGS.organization,
      ...org,
      address: { ...DEFAULT_SETTINGS.organization.address, ...(org.address ?? {}) },
      sameAs: org.sameAs ?? [],
    },
  };
}
