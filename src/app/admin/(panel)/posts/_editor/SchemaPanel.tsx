"use client";

import { useState, useTransition } from "react";
import { Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, CheckCircle2, Copy, ExternalLink, Info, Loader2, ShieldCheck } from "lucide-react";
import type { SchemaIssue } from "@/lib/seo/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SortableList } from "@/components/admin/inputs";
import { detectSchemaTypes } from "@/lib/seo/schema-types";
import { isoToIstInput, istInputToIso } from "@/lib/time";
import type { MediaItem } from "@/lib/media/types";
import { MediaField } from "./MediaField";
import type { PostForm } from "./types";

type SchemaPreview = { json: string; issues: SchemaIssue[]; url: string; live: boolean };

export function SchemaPanel({
  form,
  media,
  rememberMedia,
  contentHasVideo,
  previewSchema,
}: {
  form: PostForm;
  media: Map<string, MediaItem>;
  rememberMedia: (m: MediaItem) => void;
  contentHasVideo: boolean;
  previewSchema: () => Promise<{ ok: true; data: SchemaPreview } | { ok: false; error: string }>;
}) {
  const [preview, setPreview] = useState<SchemaPreview | null>(null);
  const [validating, startValidating] = useTransition();
  const validate = () =>
    startValidating(async () => {
      const res = await previewSchema();
      if (res.ok) setPreview(res.data);
      else toast.error(res.error);
    });
  const { control } = form;
  const [contentType, faqs, extras, breadcrumb, reviewerId] = useWatch({
    control,
    name: ["ai.contentType", "ai.faqs", "schemaExtras", "seo.breadcrumbEnabled", "reviewerId"],
  });
  const detected = detectSchemaTypes({
    contentType,
    faqCount: faqs.filter((f) => f.question.trim() && f.answer.trim()).length,
    howToStepCount: extras.howToSteps.length,
    hasVideo: contentHasVideo,
    breadcrumbEnabled: breadcrumb,
    speakableEnabled: extras.speakableEnabled,
    hasReviewer: Boolean(reviewerId),
    review: extras.review ? { itemName: extras.review.itemName, ratingValue: extras.review.ratingValue ?? null } : null,
    product: extras.product,
  });
  const isReview = contentType === "Review" || contentType === "ProductReview";

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-evergreen-700">Generated schema types</h3>
        <ul className="mt-2 space-y-1.5">
          {detected.map((d) => (
            <li key={d.type} className="text-sm">
              <span className="flex items-center gap-2 text-evergreen-700">
                <CheckCircle2 className="size-4 text-moss-ink" /> <strong className="font-medium">{d.type}</strong>
                <span className="text-xs text-muted-foreground">— {d.reason}</span>
              </span>
              {d.note && (
                <span className="ml-6 flex gap-1 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3 shrink-0" /> {d.note}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Markup is only generated for content that is visible on the page. Change the content type in the AI SEO tab.
        </p>
      </section>

      <Controller
        control={control}
        name="schemaExtras.speakableEnabled"
        render={({ field }) => (
          <label className="flex items-start justify-between gap-3 rounded-lg border border-line bg-white p-3">
            <span>
              <span className="block text-sm font-medium text-evergreen-700">Speakable</span>
              <span className="block text-xs text-muted-foreground">Marks the title, summary and takeaways for voice assistants.</span>
            </span>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </label>
        )}
      />

      {contentType === "HowTo" && (
        <section className="space-y-2">
          <Label>HowTo steps</Label>
          <Controller
            control={control}
            name="schemaExtras.howToSteps"
            render={({ field }) => (
              <SortableList
                items={field.value}
                onChange={field.onChange}
                addLabel="Add step"
                max={50}
                create={() => ({ name: "", text: "", imageId: null })}
                render={(step, update, i) => (
                  <div className="space-y-2">
                    <Input aria-label={`Step ${i + 1} name`} placeholder={`Step ${i + 1}: short name`} value={step.name} onChange={(e) => update({ ...step, name: e.target.value })} />
                    <Textarea aria-label={`Step ${i + 1} instructions`} rows={2} placeholder="What to do" value={step.text} onChange={(e) => update({ ...step, text: e.target.value })} />
                    <MediaField
                      label="Step image"
                      value={step.imageId}
                      media={media}
                      onChange={(item) => {
                        if (item) rememberMedia(item);
                        update({ ...step, imageId: item?.id ?? null });
                      }}
                    />
                  </div>
                )}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">Steps must also appear in the article body; schema must describe visible content.</p>
        </section>
      )}

      <section className="space-y-2">
        <Label>Video details (VideoObject)</Label>
        <p className="text-xs text-muted-foreground">
          VideoObject is generated only for YouTube videos embedded in the content. Enter the same URL here to add its upload date (required by Google), duration and description.
        </p>
        <Controller
          control={control}
          name="schemaExtras.video"
          render={({ field }) =>
            field.value ? (
              <div className="space-y-2 rounded-lg border border-line bg-white p-3">
                <Input aria-label="Video URL" placeholder="Watch URL" value={field.value.url} onChange={(e) => field.onChange({ ...field.value, url: e.target.value })} />
                <Input aria-label="Embed URL" placeholder="Embed URL (optional)" value={field.value.embedUrl} onChange={(e) => field.onChange({ ...field.value, embedUrl: e.target.value })} />
                <Input aria-label="Video name" placeholder="Video title" value={field.value.name} onChange={(e) => field.onChange({ ...field.value, name: e.target.value })} />
                <Textarea aria-label="Video description" rows={2} placeholder="Description" value={field.value.description} onChange={(e) => field.onChange({ ...field.value, description: e.target.value })} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    aria-label="Upload date (IST)"
                    type="datetime-local"
                    value={isoToIstInput(field.value.uploadDate)}
                    onChange={(e) => field.onChange({ ...field.value, uploadDate: istInputToIso(e.target.value) })}
                  />
                  <Input aria-label="Duration" placeholder="Duration, e.g. PT4M13S" value={field.value.duration} onChange={(e) => field.onChange({ ...field.value, duration: e.target.value })} />
                </div>
                <MediaField
                  label="Thumbnail"
                  value={field.value.thumbnailId}
                  media={media}
                  hint="Optional for YouTube videos; their thumbnail is used automatically."
                  onChange={(item) => {
                    if (item) rememberMedia(item);
                    field.onChange({ ...field.value, thumbnailId: item?.id ?? null });
                  }}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)}>
                  Remove video details
                </Button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => field.onChange({ url: "", embedUrl: "", name: "", description: "", thumbnailId: null, uploadDate: null, duration: "" })}
                >
                  Add video details
                </Button>
                {!contentHasVideo && <p className="text-xs text-muted-foreground">No video is embedded in the content yet.</p>}
              </>
            )
          }
        />
      </section>

      {isReview && (
        <section className="space-y-2">
          <Label>Review</Label>
          <Controller
            control={control}
            name="schemaExtras.review"
            render={({ field }) => {
              const r = field.value ?? { itemName: "", itemType: "Product", ratingValue: null, bestRating: 5, pros: [], cons: [] };
              const set = (patch: Partial<typeof r>) => field.onChange({ ...r, ...patch });
              return (
                <div className="space-y-2 rounded-lg border border-line bg-white p-3">
                  <Input aria-label="Reviewed item name" placeholder="What is being reviewed" value={r.itemName} onChange={(e) => set({ itemName: e.target.value })} />
                  <Input aria-label="Item type" placeholder="Item type (Product, Service, SoftwareApplication…)" value={r.itemType} onChange={(e) => set({ itemType: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      aria-label="Rating"
                      type="number"
                      step="0.1"
                      placeholder="Rating (leave empty if none)"
                      value={r.ratingValue ?? ""}
                      onChange={(e) => set({ ratingValue: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                    <Input aria-label="Best rating" type="number" value={r.bestRating} onChange={(e) => set({ bestRating: Number(e.target.value) || 5 })} />
                  </div>
                  <Textarea aria-label="Pros" rows={3} placeholder="Pros, one per line" value={r.pros.join("\n")} onChange={(e) => set({ pros: e.target.value.split("\n").filter((x) => x.trim()) })} />
                  <Textarea aria-label="Cons" rows={3} placeholder="Cons, one per line" value={r.cons.join("\n")} onChange={(e) => set({ cons: e.target.value.split("\n").filter((x) => x.trim()) })} />
                  <p className="text-xs text-muted-foreground">Only enter a rating you actually gave. Ratings are never fabricated or aggregated.</p>
                </div>
              );
            }}
          />
          {contentType === "ProductReview" && (
            <Controller
              control={control}
              name="schemaExtras.product"
              render={({ field }) => {
                const p = field.value ?? { name: "", brand: "", sku: "", priceRange: "" };
                const set = (patch: Partial<typeof p>) => field.onChange({ ...p, ...patch });
                return (
                  <div className="grid gap-2 rounded-lg border border-line bg-white p-3 sm:grid-cols-2">
                    <Input aria-label="Product name" placeholder="Product name" value={p.name} onChange={(e) => set({ name: e.target.value })} />
                    <Input aria-label="Brand" placeholder="Brand" value={p.brand} onChange={(e) => set({ brand: e.target.value })} />
                    <Input aria-label="SKU" placeholder="SKU" value={p.sku} onChange={(e) => set({ sku: e.target.value })} />
                    <Input aria-label="Price range" placeholder="Price range, e.g. ₹₹" value={p.priceRange} onChange={(e) => set({ priceRange: e.target.value })} />
                  </div>
                );
              }}
            />
          )}
        </section>
      )}

      <section className="space-y-3 border-t border-line pt-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-evergreen-700">JSON-LD preview</h3>
          <Button type="button" size="sm" variant="outline" onClick={validate} disabled={validating}>
            {validating ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} {preview ? "Re-validate" : "Generate & validate"}
          </Button>
        </div>
        {preview && (
          <>
            {preview.issues.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-moss-ink">
                <CheckCircle2 className="size-4" /> All required properties are present.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {preview.issues.map((i, k) => (
                  <li key={k} className={i.level === "error" ? "flex gap-2 text-destructive" : "flex gap-2 text-amber-700"}>
                    {i.level === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                    <span>
                      <strong>{i.type}:</strong> {i.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(preview.json);
                  toast.success("JSON-LD copied");
                }}
              >
                <Copy className="size-4" /> Copy
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(preview.url)}`} target="_blank" rel="noopener">
                  <ExternalLink className="size-4" /> Rich Results Test
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={`https://validator.schema.org/#url=${encodeURIComponent(preview.url)}`} target="_blank" rel="noopener">
                  <ExternalLink className="size-4" /> Schema.org validator
                </a>
              </Button>
            </div>
            {!preview.live && (
              <p className="text-xs text-muted-foreground">This post isn&apos;t live yet, so the URL tests can&apos;t fetch it. Use Copy and paste the code into either tool.</p>
            )}
            <pre className="max-h-96 overflow-auto rounded-md border border-line bg-paper-2 p-3 text-[11px] leading-relaxed text-evergreen-700">{preview.json}</pre>
          </>
        )}
      </section>
    </div>
  );
}
