"use client";

import { Controller, useWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CharCount, ChipsInput, SortableList } from "@/components/admin/inputs";
import { SITE_URL } from "@/lib/cms/constants";
import type { MediaItem } from "@/lib/media/types";
import { MediaField } from "./MediaField";
import { DESC_MAX_PX, PixelMeter, SerpPreview, SocialPreview, TITLE_MAX_PX } from "./Previews";
import { pickVariantUrl } from "@/lib/media/types";
import type { PostForm } from "./types";

function ToggleRow({ form, name, label, hint }: { form: PostForm; name: "seo.robotsIndex" | "seo.robotsFollow" | "seo.breadcrumbEnabled"; label: string; hint?: string }) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <label className="flex items-start justify-between gap-3 rounded-lg border border-line bg-white p-3">
          <span>
            <span className="block text-sm font-medium text-evergreen-700">{label}</span>
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
          </span>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </label>
      )}
    />
  );
}

export function SeoPanel({
  form,
  media,
  rememberMedia,
  siteName,
  defaultOgImageUrl,
}: {
  form: PostForm;
  media: Map<string, MediaItem>;
  rememberMedia: (m: MediaItem) => void;
  siteName: string;
  defaultOgImageUrl: string;
}) {
  const { control, register, setValue } = form;
  const [seoTitle, metaDescription, title, slug, ogImageId, robotsIndex, ogTitle, ogDescription, excerpt, featuredId, twitterCard, twitterTitle, twitterDescription] = useWatch({
    control,
    name: [
      "seo.seoTitle",
      "seo.metaDescription",
      "title",
      "slug",
      "seo.ogImageId",
      "seo.robotsIndex",
      "seo.ogTitle",
      "seo.ogDescription",
      "excerpt",
      "featuredImageId",
      "seo.twitterCard",
      "seo.twitterTitle",
      "seo.twitterDescription",
    ],
  });
  const selfUrl = `${SITE_URL}/blog/${slug || "your-post"}`;
  const effectiveTitle = seoTitle || title || "";
  const effectiveDesc = metaDescription || excerpt || "";
  const socialMedia = (ogImageId && media.get(ogImageId)) || (featuredId && media.get(featuredId)) || null;
  const socialImage = socialMedia ? pickVariantUrl(socialMedia, 640) : defaultOgImageUrl || null;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="seo-title">SEO title</Label>
          <CharCount value={seoTitle || title || ""} min={30} max={60} />
        </div>
        <Input id="seo-title" placeholder={title || "Defaults to the post title"} {...register("seo.seoTitle")} />
        <PixelMeter text={effectiveTitle} maxPx={TITLE_MAX_PX} font="20px Arial" label="Title width" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="meta-description">Meta description</Label>
          <CharCount value={metaDescription ?? ""} min={120} max={155} />
        </div>
        <Textarea id="meta-description" rows={3} placeholder="A compelling 120–155 character summary that includes the focus keyword." {...register("seo.metaDescription")} />
        <PixelMeter text={metaDescription ?? ""} maxPx={DESC_MAX_PX} font="14px Arial" label="Description width" />
      </div>

      <div className="space-y-1.5">
        <Label>Google preview</Label>
        <SerpPreview title={effectiveTitle} description={effectiveDesc} url={selfUrl} siteName={siteName} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="focus-kw">Focus keyword</Label>
        <Input id="focus-kw" placeholder="e.g. EPR registration for PIBOs" {...register("seo.focusKeyword")} />
      </div>
      <div className="space-y-1.5">
        <Label>Secondary keywords</Label>
        <Controller
          control={control}
          name="seo.secondaryKeywords"
          render={({ field }) => (
            <ChipsInput
              label="Secondary keywords"
              value={field.value.map((name) => ({ name }))}
              onChange={(chips) => field.onChange(chips.map((c) => c.name))}
              placeholder="Type and press Enter"
            />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="canonical">Canonical URL</Label>
        <Input id="canonical" placeholder={selfUrl} {...register("seo.canonicalUrl")} />
        <p className="text-xs text-muted-foreground">Leave empty to point to this post. Set only for syndicated or duplicate content.</p>
      </div>

      <div className="grid gap-2">
        <ToggleRow form={form} name="seo.robotsIndex" label="Allow search engines to index" hint={robotsIndex ? "index" : "noindex: hidden from search and the sitemap"} />
        <ToggleRow form={form} name="seo.robotsFollow" label="Follow links on this page" />
        <ToggleRow form={form} name="seo.breadcrumbEnabled" label="Breadcrumbs" hint="Visible trail and BreadcrumbList schema" />
      </div>

      <fieldset className="space-y-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-semibold text-evergreen-700">Open Graph (Facebook, LinkedIn)</legend>
        <Input aria-label="OG title" placeholder="OG title (defaults to SEO title)" {...register("seo.ogTitle")} />
        <Textarea aria-label="OG description" rows={2} placeholder="OG description (defaults to meta description)" {...register("seo.ogDescription")} />
        <MediaField
          label="Social image"
          value={ogImageId}
          media={media}
          hint="1200×630. Falls back to the featured image, then the site default, then a generated image."
          onChange={(item) => {
            if (item) rememberMedia(item);
            setValue("seo.ogImageId", item?.id ?? null, { shouldDirty: true });
          }}
        />
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-semibold text-evergreen-700">X / Twitter</legend>
        <Controller
          control={control}
          name="seo.twitterCard"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full bg-white" aria-label="Card type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary_large_image">Large image card</SelectItem>
                <SelectItem value="summary">Summary card</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <Input aria-label="Twitter title" placeholder="Title (defaults to OG title)" {...register("seo.twitterTitle")} />
        <Textarea aria-label="Twitter description" rows={2} placeholder="Description (defaults to OG description)" {...register("seo.twitterDescription")} />
      </fieldset>

      <div className="space-y-1.5">
        <Label>Social share preview</Label>
        <SocialPreview
          title={ogTitle || effectiveTitle}
          description={ogDescription || effectiveDesc}
          image={socialImage}
          domain={new URL(SITE_URL).host}
          card={twitterCard}
        />
        {(twitterTitle || twitterDescription) && <p className="text-xs text-muted-foreground">X uses its own title/description overrides when set.</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Custom meta tags</Label>
        <Controller
          control={control}
          name="seo.customMetaTags"
          render={({ field }) => (
            <SortableList
              items={field.value}
              onChange={field.onChange}
              addLabel="Add meta tag"
              max={20}
              create={() => ({ attr: "name" as const, key: "", content: "" })}
              render={(item, update) => (
                <div className="grid gap-2 sm:grid-cols-[90px_1fr]">
                  <select
                    aria-label="Attribute"
                    value={item.attr}
                    onChange={(e) => update({ ...item, attr: e.target.value as "name" | "property" })}
                    className="h-9 rounded-md border border-input bg-white px-2 text-sm"
                  >
                    <option value="name">name</option>
                    <option value="property">property</option>
                  </select>
                  <Input aria-label="Key" placeholder="e.g. author" value={item.key} onChange={(e) => update({ ...item, key: e.target.value })} />
                  <Input aria-label="Content" placeholder="content" value={item.content} onChange={(e) => update({ ...item, content: e.target.value })} className="sm:col-span-2" />
                </div>
              )}
            />
          )}
        />
      </div>
    </div>
  );
}
