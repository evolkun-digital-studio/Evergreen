import { connection } from "next/server";
import { isAuthorizedCron, unauthorized } from "@/lib/cron";
import { runLinkScan } from "@/lib/seo/link-checker";

// Daily broken-link scan of all published posts.
export const maxDuration = 300;

export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedCron(request)) return unauthorized();
  try {
    return Response.json({ ok: true, ...(await runLinkScan()) });
  } catch (error) {
    console.error("[cron link-check]", error);
    return Response.json({ ok: false, error: "Scan failed" }, { status: 500 });
  }
}
