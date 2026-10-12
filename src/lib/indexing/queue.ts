import "server-only";
import { after } from "next/server";
import { SITE_URL } from "@/lib/cms/constants";
import { notifyIndexing, type IndexingAction } from "./index";

export const blogUrl = (slug: string) => `${SITE_URL}/blog/${slug}`;

/** Submits URLs to search engines after the response is sent (never blocks the editor). */
export function queueIndexing(urls: string[], action: IndexingAction) {
  if (!urls.length) return;
  after(async () => {
    try {
      await notifyIndexing(urls, action);
    } catch (error) {
      console.error("[indexing]", error);
    }
  });
}
