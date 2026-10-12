import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { listTagsForAdmin } from "@/lib/data/taxonomy";
import { TermsManager } from "../categories/TermsManager";
import { deleteTagAction, mergeTagsAction, saveTagAction } from "./actions";

export const metadata: Metadata = { title: "Tags" };

export default function TagsPage() {
  return (
    <>
      <PageHeader title="Tags" description="Select duplicates (e.g. “e-waste” and “ewaste”) and merge them; old tag URLs redirect automatically." />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <TagsLoader />
      </Suspense>
    </>
  );
}

async function TagsLoader() {
  await requirePageUser("manageTaxonomy");
  const { rows, media } = await listTagsForAdmin();
  return <TermsManager kind="tag" rows={rows} media={media} save={saveTagAction} remove={deleteTagAction} merge={mergeTagsAction} />;
}
