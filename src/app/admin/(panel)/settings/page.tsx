import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { readSiteSettings } from "@/lib/data/settings";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Site identity, organization schema, analytics and search engine settings." />
      <Suspense fallback={<FormSkeleton sections={5} />}>
        <SettingsLoader />
      </Suspense>
    </>
  );
}

async function SettingsLoader() {
  await requirePageUser("manageSettings");
  const s = await readSiteSettings();
  return (
    <SettingsForm
      initial={{
        siteTitle: s.siteTitle,
        tagline: s.tagline,
        logoUrl: s.logoUrl,
        faviconUrl: s.faviconUrl,
        defaultOgImageUrl: s.defaultOgImageUrl,
        titleTemplate: s.titleTemplate,
        postsPerPage: s.postsPerPage,
        organization: s.organization,
        ga4Id: s.ga4Id,
        gtmId: s.gtmId,
        clarityId: s.clarityId,
        metaPixelId: s.metaPixelId,
        gscVerification: s.gscVerification,
        bingVerification: s.bingVerification,
        cookieConsentEnabled: s.cookieConsentEnabled,
        defaultRobotsIndex: s.defaultRobotsIndex,
        defaultRobotsFollow: s.defaultRobotsFollow,
        indexNowEnabled: s.indexNowEnabled,
        googleIndexingEnabled: s.googleIndexingEnabled,
        blockPublishBelowScore: s.blockPublishBelowScore,
      }}
    />
  );
}
