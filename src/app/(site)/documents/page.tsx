import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireDocumentsUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth";
import { listVisibleDocuments } from "@/lib/data/documents";
import { DocumentsLibrary } from "./DocumentsLibrary";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/documents/login" });
}

// The session and the document list are read inside the boundary, so nothing about the
// library (titles, counts) is rendered for a signed-out request: it redirects to the login.
async function Library() {
  await connection(); // the session read below is request-time only
  const user = await requireDocumentsUser();
  const documents = await listVisibleDocuments(user.role);
  return <DocumentsLibrary documents={documents} user={{ name: user.name, email: user.email }} signOutAction={signOutAction} />;
}

export default function DocumentsPage() {
  return (
    <section className="py-10 sm:py-14">
      <div className="container">
        <Suspense fallback={<LibrarySkeleton />}>
          <Library />
        </Suspense>
      </div>
    </section>
  );
}

function LibrarySkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-9 w-48 rounded bg-paper-2" />
      <div className="mt-3 h-5 w-96 max-w-full rounded bg-paper-2" />
      <div className="mt-8 h-11 rounded-[8px] bg-paper-2" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-[16px] bg-paper-2" />
        ))}
      </div>
    </div>
  );
}
