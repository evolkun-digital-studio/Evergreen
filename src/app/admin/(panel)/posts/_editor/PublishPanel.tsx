"use client";

import { Controller, useWatch } from "react-hook-form";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChipsInput } from "@/components/admin/inputs";
import { formatIst, isoToIstInput, istInputToIso } from "@/lib/time";
import type { MediaItem } from "@/lib/media/types";
import type { EditorPostMeta } from "@/lib/posts/editor-types";
import { MediaField } from "./MediaField";
import type { EditorOptions, PostForm } from "./types";

const NONE = "__none__";

export function PublishPanel({
  form,
  options,
  meta,
  media,
  rememberMedia,
  scheduleAt,
  onScheduleAt,
}: {
  form: PostForm;
  options: EditorOptions;
  meta: EditorPostMeta;
  media: Map<string, MediaItem>;
  rememberMedia: (m: MediaItem) => void;
  scheduleAt: string;
  onScheduleAt: (iso: string) => void;
}) {
  const { control, register, setValue } = form;
  const featuredId = useWatch({ control, name: "featuredImageId" });

  return (
    <div className="space-y-5">
      <section className="space-y-1 rounded-lg bg-paper-2 p-3 text-sm text-evergreen-700">
        <p>
          Status: <strong>{meta.status.charAt(0) + meta.status.slice(1).toLowerCase()}</strong>
          {meta.deletedAt && " (in trash)"}
        </p>
        {meta.publishedAt && <p>Published: {formatIst(meta.publishedAt)}</p>}
        {meta.modifiedAt && meta.modifiedAt !== meta.publishedAt && <p>Updated: {formatIst(meta.modifiedAt)}</p>}
        {meta.scheduledFor && <p>Scheduled for: {formatIst(meta.scheduledFor)}</p>}
      </section>

      {options.canPublish && meta.status !== "PUBLISHED" && (
        <div className="space-y-1.5">
          <Label htmlFor="schedule-at">Schedule for (IST)</Label>
          <Input id="schedule-at" type="datetime-local" value={isoToIstInput(scheduleAt)} onChange={(e) => onScheduleAt(istInputToIso(e.target.value) ?? "")} />
          <p className="text-xs text-muted-foreground">Then press “Schedule”. Publishing runs every minute.</p>
        </div>
      )}

      {options.canPublish && meta.status === "PUBLISHED" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="published-at">Publish date (IST)</Label>
            <Controller
              control={control}
              name="publishedAt"
              render={({ field }) => (
                <Input id="published-at" type="datetime-local" value={isoToIstInput(field.value)} onChange={(e) => field.onChange(istInputToIso(e.target.value))} />
              )}
            />
          </div>
          <Controller
            control={control}
            name="significantUpdate"
            render={({ field }) => (
              <label className="flex items-start justify-between gap-3 rounded-lg border border-line bg-white p-3">
                <span>
                  <span className="block text-sm font-medium text-evergreen-700">Mark as significantly updated</span>
                  <span className="block text-xs text-muted-foreground">Sets the public “Updated” date to now. Leave off for typo fixes.</span>
                </span>
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </>
      )}

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No category</SelectItem>
                {options.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tags</Label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <ChipsInput label="Tags" value={field.value} onChange={field.onChange} suggestions={options.tags} placeholder="Type and press Enter" />
          )}
        />
      </div>

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Author</Label>
          <Controller
            control={control}
            name="authorId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={options.lockAuthor}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.authors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Reviewed by (expert)</Label>
          <Controller
            control={control}
            name="reviewerId"
            render={({ field }) => (
              <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No reviewer</SelectItem>
                  {options.authors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reviewed-at">Last reviewed (IST)</Label>
          <Controller
            control={control}
            name="lastReviewedAt"
            render={({ field }) => (
              <Input id="reviewed-at" type="datetime-local" value={isoToIstInput(field.value)} onChange={(e) => field.onChange(istInputToIso(e.target.value))} />
            )}
          />
        </div>
      </div>

      <div id="featured-image" className="space-y-2">
        <Label>Featured image</Label>
        <MediaField
          label="Featured image"
          value={featuredId}
          media={media}
          hint="Use at least 1200×630. Shown in the article, listings and social shares."
          onChange={(item) => {
            if (item) rememberMedia(item);
            setValue("featuredImageId", item?.id ?? null, { shouldDirty: true });
            if (item) {
              setValue("featuredImageAlt", item.alt, { shouldDirty: true });
              setValue("featuredImageCaption", item.caption, { shouldDirty: true });
              setValue("featuredImageTitle", item.title, { shouldDirty: true });
            }
          }}
        />
        {featuredId && (
          <div className="space-y-2">
            <Input aria-label="Featured image alt text" placeholder="Alt text (required)" {...register("featuredImageAlt")} />
            <Input aria-label="Featured image caption" placeholder="Caption (optional)" {...register("featuredImageCaption")} />
            <Input aria-label="Featured image title" placeholder="Title attribute (optional)" {...register("featuredImageTitle")} />
          </div>
        )}
      </div>

      {!options.canPublish && (
        <p className="flex gap-2 rounded-md bg-paper-2 p-3 text-xs text-evergreen-700">
          <Info className="size-4 shrink-0" /> As an author you can save drafts. An editor will review and publish.
        </p>
      )}
    </div>
  );
}
