import { connection } from "next/server";
import { isAuthorizedCron, unauthorized } from "@/lib/cron";
import { publishDuePosts } from "@/lib/posts/scheduler";
import { blogUrl, queueIndexing } from "@/lib/indexing/queue";
import { logServerError } from "@/lib/log";

// Run every minute (vercel.json, or any external cron calling this URL with the secret).
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedCron(request)) return unauthorized();
  try {
    const published = await publishDuePosts();
    queueIndexing(published.filter((p) => p.indexable).map((p) => blogUrl(p.slug)), "URL_UPDATED");
    return Response.json({ ok: true, published });
  } catch (error) {
    logServerError("[cron publish-scheduled]", error);
    return Response.json({ ok: false, error: "Scheduler failed" }, { status: 500 });
  }
}
