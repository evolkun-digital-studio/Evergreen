import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/cms/constants";
import { DocumentsLoginForm } from "./DocumentsLoginForm";

export const metadata: Metadata = {
  title: "Document access",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

/** Already signed in with document access: skip the form and go where they were headed. */
async function RedirectIfSignedIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection(); // the session read below is request-time only
  const [user, { next }] = await Promise.all([getCurrentUser().catch(() => null), searchParams]);
  if (user && can.viewDocuments(user.role)) {
    redirect(next && /^\/documents(\/|\?|$)/.test(next) && !next.startsWith("/documents/login") ? next : "/documents");
  }
  return null;
}

export default function DocumentsLoginPage({ searchParams }: PageProps<"/documents/login">) {
  return (
    <section className="bg-paper-2 py-10 sm:py-16">
      <div className="container">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[24px] border border-line bg-white lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-[520px] bg-evergreen-950 lg:block">
            <Image src="/images/home/yard-handler.jpg" alt="" fill className="object-cover" sizes="(min-width: 1024px) 520px, 0px" />
            <div className="absolute inset-0 bg-evergreen-950/75" />
            <div className="relative flex h-full flex-col justify-end p-10 text-white">
              <p className="max-w-sm font-display text-3xl font-semibold leading-tight">Certificates, registrations and reports in one place.</p>
              <p className="mt-3 max-w-sm text-white/75">Signed copies of Evergreen&rsquo;s authorisations for staff and partners.</p>
            </div>
          </div>
          <div className="px-5 py-10 sm:px-10 sm:py-14">
            <h1 className="font-display text-2xl font-semibold text-evergreen-950 sm:text-3xl">Document access</h1>
            <p className="mt-2 text-[15px] text-ink-muted">Sign in with your Evergreen account to view and download documents.</p>
            <div className="mt-8">
              <Suspense fallback={<div className="h-64" />}>
                <RedirectIfSignedIn searchParams={searchParams} />
                <DocumentsLoginForm />
              </Suspense>
            </div>
            <p className="mt-8 border-t border-line pt-5 text-[13px] text-ink-muted">Access is limited to Evergreen staff and authorised partners.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
