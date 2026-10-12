import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Redirect } from "@/lib/models";
import { RedirectsManager } from "./RedirectsManager";

export const metadata: Metadata = { title: "Redirects" };

export default function RedirectsPage() {
  return (
    <>
      <PageHeader title="Redirects" description="301/302 redirects applied before any page renders. Changes take effect within a minute." />
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <RedirectsLoader />
      </Suspense>
    </>
  );
}

async function RedirectsLoader() {
  await requirePageUser("manageSeoTools");
  await connectDB();
  const rows = await Redirect.find().sort({ updatedAt: -1 }).lean();
  return (
    <RedirectsManager
      rows={rows.map((r) => ({
        id: r._id.toString(),
        fromPath: r.fromPath,
        toPath: r.toPath,
        statusCode: r.statusCode === 302 ? 302 : 301,
        hits: r.hits ?? 0,
        lastHitAt: r.lastHitAt?.toISOString() ?? null,
        automatic: Boolean(r.automatic),
      }))}
    />
  );
}
