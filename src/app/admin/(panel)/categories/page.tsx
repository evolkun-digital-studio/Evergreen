import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { listCategoriesForAdmin } from "@/lib/data/taxonomy";
import { TermsManager } from "./TermsManager";
import { deleteCategoryAction, saveCategoryAction } from "./actions";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" description="Topic hubs. Each has its own archive page at /blog/category/<slug> with its own SEO title and description." />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <CategoriesLoader />
      </Suspense>
    </>
  );
}

async function CategoriesLoader() {
  await requirePageUser("manageTaxonomy");
  const { rows, media } = await listCategoriesForAdmin();
  return <TermsManager kind="category" rows={rows} media={media} save={saveCategoryAction} remove={deleteCategoryAction} />;
}
