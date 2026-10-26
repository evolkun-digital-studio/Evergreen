import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { countPendingRequests, listRequests } from "@/lib/data/document-requests";
import { listAllDocuments } from "@/lib/data/documents";
import { RequestsManager } from "./RequestsManager";

export const metadata: Metadata = { title: "Access Requests" };

export default function DocumentRequestsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={4} columns={5} />}>
      <RequestsLoader />
    </Suspense>
  );
}

async function RequestsLoader() {
  await requirePageUser("manageDocuments");
  const [rows, documents, pending] = await Promise.all([listRequests(), listAllDocuments(), countPendingRequests()]);
  return (
    <>
      <PageHeader
        title="Access Requests"
        description={`Visitors ask for documents here. Approve to email them a private link; revoke to cut it off. ${pending} pending.`}
      />
      <RequestsManager rows={rows} documents={documents.filter((d) => d.active).map((d) => ({ id: d.id, title: d.title, category: d.category }))} />
    </>
  );
}
