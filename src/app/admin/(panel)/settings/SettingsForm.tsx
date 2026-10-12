"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Info, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormSection, SwitchField, TextareaField, TextField } from "@/components/admin/fields";
import { settingsSchema, type SettingsInput } from "@/lib/validation/settings";
import { SITE_URL } from "@/lib/cms/constants";
import { saveSettingsAction } from "./actions";

// The form edits `sameAs` as one URL per line.
const formSchema = settingsSchema.extend({
  organization: settingsSchema.shape.organization.extend({ sameAs: z.string() }),
});
type FormValues = z.input<typeof formSchema>;

const toInput = (v: FormValues): unknown => ({
  ...v,
  organization: {
    ...v.organization,
    sameAs: v.organization.sameAs
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  },
});

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...initial, organization: { ...initial.organization, sameAs: initial.organization.sameAs.join("\n") } },
  });
  const c = form.control;
  const [gtm, ga4] = useWatch({ control: c, name: ["gtmId", "ga4Id"] });

  const onSubmit = (values: FormValues) =>
    startTransition(async () => {
      const res = await saveSettingsAction(toInput(values));
      if (res.ok) {
        toast.success(res.message ?? "Saved");
        form.reset(values);
      } else {
        toast.error(res.error);
        for (const [path, message] of Object.entries(res.fieldErrors ?? {})) {
          form.setError(path as keyof FormValues, { message });
        }
      }
    });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="General">
          <TextField control={c} name="siteTitle" label="Site title" />
          <TextField control={c} name="tagline" label="Tagline" />
          <TextField control={c} name="titleTemplate" label="Title template" description="%s is replaced by the page title." />
          <TextField control={c} name="postsPerPage" label="Posts per page" type="number" />
          <TextField control={c} name="logoUrl" label="Logo URL" />
          <TextField control={c} name="faviconUrl" label="Favicon URL" description="Square PNG/SVG, at least 512×512." />
          <TextField control={c} name="defaultOgImageUrl" label="Default social image URL" description="1200×630. Used when a post has no OG image." />
        </FormSection>

        <FormSection title="Organization" description="Feeds the Organization schema on every page.">
          <TextField control={c} name="organization.name" label="Name" />
          <TextField control={c} name="organization.legalName" label="Legal name" />
          <TextField control={c} name="organization.url" label="Website URL" />
          <TextField control={c} name="organization.logo" label="Logo URL (schema)" />
          <TextField control={c} name="organization.phone" label="Phone" />
          <TextField control={c} name="organization.email" label="Email" type="email" />
          <TextField control={c} name="organization.address.streetAddress" label="Street address" />
          <TextField control={c} name="organization.address.addressLocality" label="City" />
          <TextField control={c} name="organization.address.addressRegion" label="State" />
          <TextField control={c} name="organization.address.postalCode" label="PIN code" />
          <TextField control={c} name="organization.address.addressCountry" label="Country code" maxLength={2} />
          <div className="md:col-span-2">
            <TextareaField control={c} name="organization.description" label="Description" rows={3} />
          </div>
          <div className="md:col-span-2">
            <TextareaField
              control={c}
              name="organization.sameAs"
              label="Official profiles (sameAs)"
              description="One URL per line: LinkedIn, X, YouTube, Wikipedia…"
              rows={4}
            />
          </div>
        </FormSection>

        <FormSection title="Analytics" description="Scripts load only when an ID is set.">
          <TextField control={c} name="gtmId" label="Google Tag Manager ID" placeholder="GTM-XXXXXXX" />
          <TextField control={c} name="ga4Id" label="Google Analytics 4 ID" placeholder="G-XXXXXXXXXX" />
          {gtm && ga4 && (
            <p className="flex gap-2 rounded-md bg-paper-2 p-3 text-sm text-evergreen-700 md:col-span-2">
              <Info className="mt-0.5 size-4 shrink-0" />
              GTM is set, so GA4 won&apos;t be loaded directly (to avoid double counting). Fire GA4 from a tag inside GTM instead.
            </p>
          )}
          <TextField control={c} name="clarityId" label="Microsoft Clarity ID" />
          <TextField control={c} name="metaPixelId" label="Meta Pixel ID" />
          <div className="md:col-span-2">
            <SwitchField
              control={c}
              name="cookieConsentEnabled"
              label="Cookie consent banner"
              description="When on, analytics load only after the visitor accepts."
            />
          </div>
        </FormSection>

        <FormSection title="Search engines">
          <TextField control={c} name="gscVerification" label="Google Search Console verification" description="Content of the google-site-verification meta tag." />
          <TextField control={c} name="bingVerification" label="Bing verification" description="Content of the msvalidate.01 meta tag." />
          <SwitchField control={c} name="defaultRobotsIndex" label="Index new posts by default" />
          <SwitchField control={c} name="defaultRobotsFollow" label="Follow links by default" />
          <SwitchField
            control={c}
            name="indexNowEnabled"
            label="IndexNow"
            description="Pings Bing, Yandex, Seznam and Naver when posts are published, updated or deleted."
          />
          <SwitchField
            control={c}
            name="googleIndexingEnabled"
            label="Google Indexing API"
            description="Google officially supports this API only for JobPosting and BroadcastEvent pages. Blog posts are discovered through the sitemap, internal links and Search Console. Leave off unless you know you need it."
          />
          <p className="text-sm text-muted-foreground md:col-span-2">
            Sitemap:{" "}
            <a className="text-moss-ink underline" href={`${SITE_URL}/sitemap.xml`} target="_blank" rel="noopener">
              {SITE_URL}/sitemap.xml
            </a>{" "}
            — generated automatically, submit it once in Search Console and Bing Webmaster Tools.
          </p>
        </FormSection>

        <FormSection title="Publishing">
          <TextField
            control={c}
            name="blockPublishBelowScore"
            label="Block publishing below SEO score"
            type="number"
            description="0 = never block (editors are only warned)."
          />
        </FormSection>

        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" disabled={pending || !form.formState.isDirty} className="shadow-lg">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
