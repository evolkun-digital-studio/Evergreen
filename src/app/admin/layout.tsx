import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./admin.css";

export const metadata: Metadata = {
  title: { template: "%s · Evergreen CMS", default: "Evergreen CMS" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster theme="light" position="bottom-right" richColors closeButton />
    </>
  );
}
