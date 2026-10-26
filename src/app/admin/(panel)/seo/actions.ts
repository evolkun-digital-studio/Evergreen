"use server";

import mongoose from "mongoose";
import { after } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { IndexingLog, Redirect, SiteSettings } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { expireTags } from "@/lib/revalidate";
import { TAGS } from "@/lib/cache-tags";
import { normalize } from "@/lib/redirects/lookup";
import { notifyIndexing, type IndexingAction } from "@/lib/indexing";
import { runLinkScan } from "@/lib/seo/link-checker";
import { DEFAULT_ROBOTS_TXT } from "@/lib/cms/defaults";
import { SITE_URL } from "@/lib/cms/constants";
import { logServerError } from "@/lib/log";

// --- Redirects ---------------------------------------------------------------------------------

const RESERVED = /^\/(admin|api|_next|uploads)(\/|$)/;

const redirectSchema = z.object({
  fromPath: z
    .string()
    .trim()
    .min(2, "Enter the old path, e.g. /old-page")
    .refine((v) => v.startsWith("/") && !v.startsWith("//"), "Must start with /")
    .refine((v) => !RESERVED.test(v), "Admin, API and asset paths can't be redirected")
    .transform(normalize),
  toPath: z
    .string()
    .trim()
    .min(1, "Enter the destination")
    .refine((v) => (v.startsWith("/") && !v.startsWith("//")) || /^https?:\/\/\S+$/.test(v), "Use a path (/new-page) or a full https:// URL")
    .transform((v) => (v.startsWith("/") ? normalize(v) : v)),
  statusCode: z.union([z.literal(301), z.literal(302)]),
});

export async function saveRedirectAction(id: string | null, input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageSeoTools");
    const data = redirectSchema.parse(input);
    if (data.fromPath === data.toPath || data.toPath === `${SITE_URL}${data.fromPath}`) {
      throw new UserFacingError("A redirect can't point to itself.", { toPath: "Same as the source" });
    }
    await connectDB();
    // Follow the destination through existing redirects to catch loops (A → B → A).
    const seen = new Set([data.fromPath]);
    let hop = data.toPath;
    for (let i = 0; i < 20 && hop.startsWith("/"); i++) {
      if (seen.has(hop)) throw new UserFacingError(`This would create a redirect loop via ${hop}.`, { toPath: "Creates a loop" });
      seen.add(hop);
      const nextHop = await Redirect.findOne({ fromPath: hop, ...(id ? { _id: { $ne: id } } : {}) }).select({ toPath: 1 }).lean();
      if (!nextHop) break;
      hop = nextHop.toPath;
    }
    if (await Redirect.exists({ fromPath: data.fromPath, ...(id ? { _id: { $ne: id } } : {}) })) {
      throw new UserFacingError("A redirect from this path already exists.", { fromPath: "Already redirected" });
    }
    if (id) await Redirect.updateOne({ _id: id }, { $set: { ...data, automatic: false } });
    else await Redirect.create({ ...data, automatic: false });
    expireTags([TAGS.redirects]);
  }, "Redirect saved. It takes effect within a minute.");
}

export async function deleteRedirectAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageSeoTools");
    if (!mongoose.isValidObjectId(id)) throw new UserFacingError("Invalid redirect.");
    await connectDB();
    await Redirect.deleteOne({ _id: id });
    expireTags([TAGS.redirects]);
  }, "Redirect deleted");
}

// --- Robots.txt --------------------------------------------------------------------------------

export async function saveRobotsAction(text: string) {
  return runAction(async () => {
    await requireActionUser("manageSettings");
    const value = z.string().max(20_000).parse(text).replace(/\r\n/g, "\n");
    await connectDB();
    await SiteSettings.updateOne({ key: "site" }, { $set: { robotsTxt: value || DEFAULT_ROBOTS_TXT } }, { upsert: true });
    expireTags([TAGS.settings]);
  }, "robots.txt saved");
}

// --- Indexing ----------------------------------------------------------------------------------

export async function requestIndexingAction(url: string, action: IndexingAction = "URL_UPDATED") {
  return runAction(async () => {
    await requireActionUser("manageSeoTools");
    const clean = z.string().trim().url().parse(url);
    if (new URL(clean).host !== new URL(SITE_URL).host) throw new UserFacingError(`Only ${new URL(SITE_URL).host} URLs can be submitted.`);
    const results = await notifyIndexing([clean], z.enum(["URL_UPDATED", "URL_DELETED"]).parse(action), { force: true });
    const failed = results.filter((r) => !r.ok);
    if (failed.length) throw new UserFacingError(`Submission failed: ${failed.map((f) => `${f.engine}: ${f.response}`).join("; ")}`);
    return results.length;
  }, "Submitted for indexing");
}

export async function retryIndexingEntryAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageSeoTools");
    await connectDB();
    const entry = await IndexingLog.findById(id).lean();
    if (!entry) throw new UserFacingError("Log entry not found.");
    const results = await notifyIndexing([entry.url], entry.action as IndexingAction, { force: true });
    if (results.some((r) => !r.ok)) throw new UserFacingError("Resubmission failed again; see the newest log entry.");
  }, "Resubmitted");
}

// --- Broken links ------------------------------------------------------------------------------

export async function scanLinksAction() {
  return runAction(async () => {
    await requireActionUser("manageSeoTools");
    // A full scan can take a while; run it after the response so the button returns at once.
    after(async () => {
      try {
        await runLinkScan();
      } catch (error) {
        logServerError("[link scan]", error);
      }
    });
  }, "Scan started. Results appear here in a minute or two.");
}
