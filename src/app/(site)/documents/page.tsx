import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { listPublicDocumentOptions } from "@/lib/data/document-requests";
import { RequestAccessForm } from "./RequestAccessForm";

export const metadata: Metadata = {
  title: "Request document access",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

async function RequestForm({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  await connection();
  const [options, { link }] = await Promise.all([
    listPublicDocumentOptions().catch(() => []),
    searchParams,
  ]);
  const notice =
    link === "invalid" ? (
      <div
        role="alert"
        className="rounded-xl border border-copper/30 bg-copper/5 px-4 py-3 text-[14px] leading-relaxed text-evergreen-950"
      >
        <span className="font-medium">This link is no longer valid.</span> You
        can request access again.
      </div>
    ) : null;
  return <RequestAccessForm options={options} notice={notice} />;
}

export default function DocumentsPage({
  searchParams,
}: PageProps<"/documents">) {
  return (
    <section className="min-h-[calc(100svh-4rem)] bg-white px-5 py-5 sm:px-8 sm:py-7 lg:px-12 xl:px-16">
      <Suspense
        fallback={
          <section
            aria-hidden="true"
            className="h-[38rem] w-full animate-pulse bg-[#f7f8f6] motion-reduce:animate-none"
          />
        }
      >
        <RequestForm searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
