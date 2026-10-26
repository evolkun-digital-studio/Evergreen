import { connection } from "next/server";
import { isAuthorizedCron, unauthorized } from "@/lib/cron";
import { retryIndexing } from "@/lib/indexing";
import { logServerError } from "@/lib/log";

// IndexNow / Google retry queue (every 10 minutes).
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedCron(request)) return unauthorized();
  try {
    return Response.json({ ok: true, retried: await retryIndexing() });
  } catch (error) {
    logServerError("[cron indexing-retry]", error);
    return Response.json({ ok: false, error: "Retry failed" }, { status: 500 });
  }
}
