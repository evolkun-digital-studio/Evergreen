import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/config/site";
import { LoginForm } from "./LoginForm";
import Image from "next/image";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-paper-2 lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-evergreen-950 lg:block">
        <Image src="/images/home/yard-handler.jpg" alt="Evergreen recycling yard" fill priority className="object-cover" sizes="(min-width: 1024px) 54vw, 0vw" />
        <div className="absolute inset-0 bg-evergreen-950/75" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16"><Image src={site.logo} alt="Evergreen" width={260} height={65} className="h-12 w-fit max-w-64 object-contain brightness-0 invert" /><div><p className="max-w-xl font-display text-4xl font-semibold leading-tight text-white">Manage Evergreen content, enquiries and search visibility.</p><p className="mt-4 max-w-lg text-white/75">A focused workspace for the Evergreen recycling team.</p></div><p className="text-sm text-white/60">Ever Green E-Waste Recycling Management</p></div>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={site.logo}
            alt="Evergreen"
            width={1326}
            height={332}
            className="mx-auto block h-8 w-auto max-w-[150px] object-contain"
          />
          <h1 className="mt-5 font-display text-xl font-semibold text-evergreen-700">Evergreen CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage posts, enquiries and SEO.</p>
        </div>
        <Suspense fallback={<div className="h-56" />}>
          <LoginForm />
        </Suspense>
      </div>
      </section>
    </main>
  );
}
