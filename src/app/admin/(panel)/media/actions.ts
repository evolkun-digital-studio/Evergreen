"use server";

import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Media } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { findMediaUsage, listMedia, toMediaItem, type MediaQuery } from "@/lib/data/media";
import { allStorageKeys } from "@/lib/media/process";
import { storageFor } from "@/lib/media/storage";
import { expireTags } from "@/lib/revalidate";
import { TAGS } from "@/lib/cache-tags";
import type { MediaVariants } from "@/lib/media/types";

const idSchema = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");

const metaSchema = z.object({
  alt: z.string().trim().max(300),
  title: z.string().trim().max(200),
  caption: z.string().trim().max(500),
  description: z.string().trim().max(2000),
});

export async function listMediaAction(query: MediaQuery) {
  return runAction(async () => {
    await requireActionUser("manageMedia");
    return listMedia({ ...query, perPage: Math.min(query.perPage ?? 40, 100) });
  });
}

export async function updateMediaAction(id: string, input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageMedia");
    const data = metaSchema.parse(input);
    await connectDB();
    const doc = await Media.findOneAndUpdate({ _id: idSchema.parse(id), deletedAt: null }, { $set: data }, { returnDocument: "after" }).lean();
    if (!doc) throw new UserFacingError("That file no longer exists.");
    // Alt text and captions are rendered into published articles.
    expireTags([TAGS.media, TAGS.posts]);
    return toMediaItem(doc);
  }, "Media details saved");
}

export async function mediaUsageAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageMedia");
    return findMediaUsage(idSchema.parse(id));
  });
}

export async function deleteMediaAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageMedia");
    const mediaId = idSchema.parse(id);
    const usage = await findMediaUsage(mediaId);
    if (usage.length) {
      throw new UserFacingError(`This file is still used by ${usage.length} item${usage.length > 1 ? "s" : ""}: ${usage.map((u) => u.label).join(", ")}.`);
    }
    await connectDB();
    const doc = await Media.findOneAndUpdate({ _id: mediaId, deletedAt: null }, { $set: { deletedAt: new Date() } }).lean();
    if (!doc) throw new UserFacingError("That file no longer exists.");
    // Soft-deleted in the database; the stored objects are removed so they stop costing storage.
    const storage = storageFor(doc.storageDriver);
    await Promise.allSettled(allStorageKeys({ storageKey: doc.storageKey, variants: doc.variants as MediaVariants }).map((k) => storage.delete(k)));
    expireTags([TAGS.media]);
  }, "File deleted");
}
