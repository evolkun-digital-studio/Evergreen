import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/config/site";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-evergreen-900 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl shadow-black/20">
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
    </main>
  );
}
