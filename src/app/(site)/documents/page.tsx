import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listPublicDocumentOptions } from "@/lib/data/document-requests";
import { RequestAccessForm } from "./RequestAccessForm";

export const metadata: Metadata = {
  title: "Request document access",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const STEPS = [
  { title: "Tell us what you need", body: "Pick a document type, name a file, or just describe it." },
  { title: "Our admin reviews it", body: "Every request is checked by a person before anything is shared." },
  { title: "A private link arrives by email", body: "It opens only what was approved and can be withdrawn at any time." },
];

async function RequestForm() {
  await connection(); // the document list changes as files are uploaded; read it per request
  const options = await listPublicDocumentOptions().catch(() => []);
  return <RequestAccessForm options={options} />;
}

async function InvalidLinkNotice({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;
  if (link !== "invalid") return null;
  return (
    <p role="alert" className="mb-6 rounded-[10px] bg-paper-2 px-4 py-3 text-[14px] text-evergreen-950">
      This link is no longer valid. You can request access again.
    </p>
  );
}

export default function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  return (
    <section className="bg-paper-2 py-8 sm:py-14">
      <div className="container">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[24px] border border-line bg-white lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="relative bg-evergreen-950 text-white">
            <Image
              src="/images/home/yard-handler.jpg"
              alt=""
              fill
              priority
              className="hidden object-cover lg:block"
              sizes="(min-width: 1024px) 480px, 0px"
            />
            <div className="absolute inset-0 hidden bg-evergreen-950/80 lg:block" />
            <div className="relative flex h-full flex-col gap-8 p-6 sm:p-10 lg:sticky lg:top-24 lg:justify-between lg:p-10">
              <div>
                <h1 className="font-display text-3xl font-semibold leading-tight text-white! sm:text-4xl">Request document access</h1>
                <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/75">
                  Our certificates, registrations and reports are shared on request, not left open on the website.
                </p>
              </div>
              <ol className="space-y-5">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/40 text-[14px] font-semibold">{i + 1}</span>
                    <div>
                      <p className="font-display text-[15px] font-semibold">{step.title}</p>
                      <p className="mt-0.5 text-[14px] leading-snug text-white/70">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-[13px] text-white/65">
                Evergreen staff can{" "}
                <Link href="/documents/login" className="font-semibold text-white underline underline-offset-2">
                  sign in
                </Link>{" "}
                to open the library directly.
              </p>
            </div>
          </aside>

          <div className="p-6 sm:p-10">
            <Suspense fallback={null}>
              <InvalidLinkNotice searchParams={searchParams} />
            </Suspense>
            <Suspense fallback={<div aria-hidden="true" className="h-[32rem] animate-pulse rounded-[16px] bg-paper-2" />}>
              <RequestForm />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
