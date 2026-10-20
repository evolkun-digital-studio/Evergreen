import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { readSiteSettings } from "@/lib/data/settings";
import { listLetterheads } from "@/lib/data/letterheads";
import { site } from "@/config/site";
import { DEFAULT_SETTINGS } from "@/lib/cms/defaults";
import { LetterheadEditor } from "./LetterheadEditor";

export const metadata: Metadata = { title: "Letterhead Editor" };

export default function LetterheadPage() {
  return (
    <>
      <PageHeader title="Letterhead Editor" description="Create, save and download professional Evergreen letters from one live A4 workspace." />
      <Suspense fallback={<FormSkeleton sections={4} />}>
        <LetterheadLoader />
      </Suspense>
    </>
  );
}

async function LetterheadLoader() {
  await requirePageUser("manageLetterheads");
  const [settings, documents] = await Promise.all([readSiteSettings(), listLetterheads()]);
  const organization = settings.organization;
  const address = [organization.address.streetAddress, organization.address.addressLocality, organization.address.addressRegion, organization.address.postalCode]
    .filter(Boolean)
    .join(", ");
  return (
    <LetterheadEditor
      initialDocuments={documents}
      company={{
        name: organization.name || settings.siteTitle,
        legalName: organization.legalName || organization.name || settings.siteTitle,
        logoUrl: settings.logoUrl && settings.logoUrl !== DEFAULT_SETTINGS.logoUrl ? settings.logoUrl : site.logo,
        website: organization.url || "",
        email: organization.email || "",
        phone: organization.phone || "",
        alternatePhone: site.alternatePhone,
        address,
      }}
    />
  );
}
