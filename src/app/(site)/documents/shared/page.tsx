import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listGrantedDocuments, resolveGrant } from "@/lib/data/document-requests";
import { GRANT_COOKIE } from "@/lib/documents/grant";
import { DocumentsLibrary } from "../library/DocumentsLibrary";

export const metadata: Metadata = {
  title: "Shared documents",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

// The grant is re-checked against the database on every render, so a revoked link shows nothing.
async function SharedDocuments() {
  await connection();
  const grant = await resolveGrant((await cookies()).get(GRANT_COOKIE)?.value).catch(() => null);
  if (!grant) redirect("/documents?link=invalid");
  const documents = await listGrantedDocuments(grant);
  // One document: open it straight away in the browser's viewer.
  if (documents.length === 1) redirect(`/api/documents/${documents[0].id}/file`);
  return <DocumentsLibrary documents={documents} user={{ name: grant.email, email: grant.email }} />;
}

export default function SharedDocumentsPage() {
  return (
    <section className="py-10 sm:py-14">
      <div className="container">
        <Suspense fallback={<div aria-hidden="true" className="h-64 animate-pulse rounded-[16px] bg-paper-2" />}>
          <SharedDocuments />
        </Suspense>
      </div>
    </section>
  );
}
