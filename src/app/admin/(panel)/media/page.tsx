import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { listMedia } from "@/lib/data/media";
import { MediaLibrary } from "./MediaLibrary";

export const metadata: Metadata = { title: "Media" };

export default function MediaPage() {
  return (
    <>
      <PageHeader title="Media Library" description="Upload once, reuse everywhere. Alt text set here is used whenever the image is inserted." />
      <Suspense fallback={<TableSkeleton rows={4} columns={6} />}>
        <MediaLoader />
      </Suspense>
    </>
  );
}

async function MediaLoader() {
  await requirePageUser("manageMedia");
  const initial = await listMedia({ perPage: 40 });
  return <MediaLibrary initial={initial} />;
}
