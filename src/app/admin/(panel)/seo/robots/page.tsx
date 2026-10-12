import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { readSiteSettings } from "@/lib/data/settings";
import { RobotsEditor } from "./RobotsEditor";

export const metadata: Metadata = { title: "Robots.txt" };

export default function RobotsPage() {
  return (
    <>
      <PageHeader title="Robots.txt" description="Controls what crawlers may fetch. Keep /admin, /api and preview URLs disallowed." />
      <Suspense fallback={<FormSkeleton sections={1} />}>
        <RobotsLoader />
      </Suspense>
    </>
  );
}

async function RobotsLoader() {
  await requirePageUser("manageSettings");
  const settings = await readSiteSettings();
  return <RobotsEditor initial={settings.robotsTxt} />;
}
