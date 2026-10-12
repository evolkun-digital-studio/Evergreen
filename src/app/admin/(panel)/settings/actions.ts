"use server";

import { updateTag } from "next/cache";
import { connectDB } from "@/lib/db";
import { SiteSettings } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction } from "@/lib/actions";
import { settingsSchema } from "@/lib/validation/settings";
import { TAGS } from "@/lib/cache-tags";

export async function saveSettingsAction(input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageSettings");
    const data = settingsSchema.parse(input);
    await connectDB();
    await SiteSettings.updateOne({ key: "site" }, { $set: data, $setOnInsert: { key: "site" } }, { upsert: true });
    // Settings feed every public page (JSON-LD, analytics, sitemaps), so expire them immediately.
    updateTag(TAGS.settings);
    updateTag(TAGS.sitemap);
  }, "Settings saved");
}
