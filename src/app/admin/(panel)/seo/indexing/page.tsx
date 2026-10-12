import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { IndexingLog } from "@/lib/models";
import { readSiteSettings } from "@/lib/data/settings";
import { isPublicSite } from "@/lib/indexing";
import { INDEXING_STATUSES, SITE_URL } from "@/lib/cms/constants";
import { formatIst } from "@/lib/time";
import { cn } from "@/lib/utils";
import { RequestIndexingForm, RetryButton } from "./IndexingTools";

export const metadata: Metadata = { title: "Indexing log" };

export default function IndexingPage({ searchParams }: PageProps<"/admin/seo/indexing">) {
  return (
    <>
      <PageHeader
        title="Indexing log"
        description="Every IndexNow (Bing, Yandex, Seznam, Naver) and Google Indexing API call. Published, updated and unpublished posts are submitted automatically; entries are kept for 90 days."
      />
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <IndexingLoader searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  RETRYING: "bg-amber-100 text-amber-800",
  PENDING: "bg-paper-2 text-evergreen-700",
};

async function IndexingLoader({ searchParams }: { searchParams: PageProps<"/admin/seo/indexing">["searchParams"] }) {
  await requirePageUser("manageSeoTools");
  const sp = await searchParams;
  const status = (INDEXING_STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as (typeof INDEXING_STATUSES)[number]) : "";
  await connectDB();
  const [settings, logs] = await Promise.all([
    readSiteSettings(),
    IndexingLog.find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
  ]);
  const keySet = Boolean(process.env.INDEXNOW_KEY);

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-evergreen-700">
          <span>
            IndexNow: <strong>{settings.indexNowEnabled ? (keySet ? "on" : "on, but INDEXNOW_KEY is missing") : "off"}</strong>
          </span>
          <span>
            Google Indexing API: <strong>{settings.googleIndexingEnabled ? (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? "on" : "on, but no service account") : "off"}</strong>
          </span>
          {keySet && (
            <a href={`/${process.env.INDEXNOW_KEY}.txt`} target="_blank" rel="noopener" className="text-moss-ink underline">
              Key file
            </a>
          )}
        </div>
        {!isPublicSite() && (
          <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> NEXT_PUBLIC_SITE_URL is {SITE_URL}, which search engines can&apos;t reach. Submissions are logged but not sent until it
            points at the live site.
          </p>
        )}
        <p className="flex gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" /> Google discovers blog posts through the sitemap, internal links and Search Console. The Google Indexing API is officially only for
          JobPosting and BroadcastEvent pages.
        </p>
        <RequestIndexingForm siteUrl={SITE_URL} />
      </section>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-1 text-sm">
        {["", "SUCCESS", "RETRYING", "FAILED"].map((s) => (
          <a
            key={s || "all"}
            href={s ? `?status=${s}` : "?"}
            className={cn("rounded-md px-3 py-1.5", status === s ? "bg-evergreen-700 text-white" : "text-evergreen-700 hover:bg-paper-2")}
          >
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
          </a>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Engine</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Response</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nothing submitted yet.
                </TableCell>
              </TableRow>
            )}
            {logs.map((l) => (
              <TableRow key={l._id.toString()}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatIst(l.createdAt)}</TableCell>
                <TableCell className="max-w-[320px] break-all text-xs text-evergreen-700">{l.url}</TableCell>
                <TableCell className="text-sm">{l.engine === "indexnow" ? "IndexNow" : "Google"}</TableCell>
                <TableCell className="text-xs">{l.action === "URL_UPDATED" ? "Updated" : "Deleted"}</TableCell>
                <TableCell>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[l.status])}>
                    {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                    {l.responseCode ? ` · ${l.responseCode}` : ""}
                  </span>
                  {l.status === "RETRYING" && l.nextAttemptAt && <span className="block text-[11px] text-muted-foreground">next {formatIst(l.nextAttemptAt)}</span>}
                </TableCell>
                <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground" title={l.response}>
                  {l.response}
                </TableCell>
                <TableCell>{l.status !== "SUCCESS" && <RetryButton id={l._id.toString()} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
