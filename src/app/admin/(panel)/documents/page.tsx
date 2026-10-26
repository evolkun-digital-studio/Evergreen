import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { listAllDocuments } from "@/lib/data/documents";
import { DocumentsManager } from "./DocumentsManager";

export const metadata: Metadata = { title: "Documents" };

export default function AdminDocumentsPage() {
  return (
    <>
      <PageHeader
        title="Documents"
        description="Private certificates, registrations and reports. Files are stored outside the public site. Visitors request access on /documents and open files through an emailed link once you approve them under Access Requests."
      />
      <Suspense fallback={<TableSkeleton rows={4} columns={5} />}>
        <DocumentsLoader />
      </Suspense>
    </>
  );
}

async function DocumentsLoader() {
  await requirePageUser("manageDocuments");
  return <DocumentsManager rows={await listAllDocuments()} />;
}
