import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Header />
      <main id="main" className="flex-1">
        <section className="container py-24 lg:py-36">
          <p className="font-display text-sm font-medium text-copper-ink">Error 404</p>
          <h1 className="mt-4 max-w-2xl text-evergreen-950">
            This page is not here
          </h1>
          <p className="lead mt-6 max-w-xl text-ink-muted">
            The link may be old, or the page may have moved. The home page lists our services and contact details.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="btn btn-primary">
              Go to the home page
            </Link>
            <Link href="/contact" className="btn btn-secondary">
              Contact us
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
