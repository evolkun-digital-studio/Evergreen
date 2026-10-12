"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { GitMerge, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CharCount } from "@/components/admin/inputs";
import { MediaPickerProvider } from "@/components/admin/media/MediaPicker";
import { MediaField } from "../posts/_editor/MediaField";
import { slugify } from "@/lib/slug";
import { SITE_URL } from "@/lib/cms/constants";
import type { MediaItem } from "@/lib/media/types";
import type { ActionResult } from "@/lib/actions";
import type { TermRow } from "@/lib/data/taxonomy";


type FormValues = {
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  parentId: string | null;
  ogImageId: string | null;
  sortOrder: number;
};

type Props = {
  kind: "category" | "tag";
  rows: TermRow[];
  media: MediaItem[];
  save: (id: string | null, input: unknown) => Promise<ActionResult<void>>;
  remove: (id: string) => Promise<ActionResult<void>>;
  merge?: (sourceIds: string[], targetId: string) => Promise<ActionResult<string>>;
};

export function TermsManager(props: Props) {
  return (
    <MediaPickerProvider>
      <TermsManagerInner {...props} />
    </MediaPickerProvider>
  );
}

function TermsManagerInner({ kind, rows, media: initialMedia, save, remove, merge }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<TermRow | "new" | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [pending, startTransition] = useTransition();
  const [media, setMedia] = useState(() => new Map(initialMedia.map((m) => [m.id, m])));
  const label = kind === "category" ? "category" : "tag";
  const archiveBase = `/blog/${kind}/`;

  const form = useForm<FormValues>();
  const [slugTouched, setSlugTouched] = useState(false);

  const openEditor = (row: TermRow | "new") => {
    const r = row === "new" ? null : row;
    form.reset({
      name: r?.name ?? "",
      slug: r?.slug ?? "",
      description: r?.description ?? "",
      seoTitle: r?.seoTitle ?? "",
      metaDescription: r?.metaDescription ?? "",
      parentId: r?.parentId ?? null,
      ogImageId: r?.ogImageId ?? null,
      sortOrder: r?.sortOrder ?? 0,
    });
    setSlugTouched(Boolean(r));
    setEditing(row);
  };

  const submit = (values: FormValues) =>
    startTransition(async () => {
      const id = editing === "new" || !editing ? null : editing.id;
      const payload = kind === "category" ? values : { name: values.name, slug: values.slug, description: values.description, seoTitle: values.seoTitle, metaDescription: values.metaDescription };
      const res = await save(id, payload);
      if (!res.ok) {
        toast.error(res.error);
        for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as keyof FormValues, { message: m });
        return;
      }
      toast.success(res.message ?? "Saved");
      setEditing(null);
      router.refresh();
    });

  const del = (row: TermRow) => {
    const warn = kind === "tag" && row.postCount ? ` It will be removed from ${row.postCount} post(s).` : "";
    if (!window.confirm(`Delete ${label} “${row.name}”?${warn}`)) return;
    startTransition(async () => {
      const res = await remove(row.id);
      if (res.ok) {
        toast.success(res.message ?? "Deleted");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const doMerge = () =>
    merge &&
    startTransition(async () => {
      const res = await merge([...selected], mergeTarget);
      if (res.ok) {
        toast.success(res.data);
        setMergeOpen(false);
        setSelected(new Set());
        router.refresh();
      } else toast.error(res.error);
    });

  const visible = rows.filter((r) => !q.trim() || r.name.toLowerCase().includes(q.toLowerCase()) || r.slug.includes(q.toLowerCase()));
  const parentName = new Map(rows.map((r) => [r.id, r.name]));
  const original = editing && editing !== "new" ? editing : null;
  const [slugValue, seoTitle, metaDescription, ogImageId] = useWatch({
    control: form.control,
    name: ["slug", "seoTitle", "metaDescription", "ogImageId"],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label === "category" ? "categories" : "tags"}`} className="w-64 bg-white pl-8" />
        </div>
        {merge && selected.size > 0 && (
          <Button variant="outline" onClick={() => setMergeOpen(true)}>
            <GitMerge className="size-4" /> Merge {selected.size} selected
          </Button>
        )}
        <Button className="ml-auto" onClick={() => openEditor("new")}>
          <Plus className="size-4" /> Add {label}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {merge && <TableHead className="w-10" />}
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              {kind === "category" && <TableHead>Parent</TableHead>}
              <TableHead>SEO title</TableHead>
              <TableHead className="text-right">Posts</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nothing here yet.
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => (
              <TableRow key={r.id}>
                {merge && (
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${r.name}`}
                      checked={selected.has(r.id)}
                      onCheckedChange={(v) =>
                        setSelected((cur) => {
                          const n = new Set(cur);
                          if (v) n.add(r.id);
                          else n.delete(r.id);
                          return n;
                        })
                      }
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium text-evergreen-700">{r.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.slug}</TableCell>
                {kind === "category" && <TableCell className="text-sm">{r.parentId ? parentName.get(r.parentId) : "—"}</TableCell>}
                <TableCell className="max-w-xs truncate text-sm">{r.seoTitle || <span className="text-muted-foreground">Default</span>}</TableCell>
                <TableCell className="text-right tabular-nums">{r.postCount}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${r.name}`} onClick={() => openEditor(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${r.name}`} onClick={() => del(r)} disabled={pending}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{original ? `Edit ${label}` : `New ${label}`}</DialogTitle>
            <DialogDescription>
              Archive page: {SITE_URL}
              {archiveBase}
              {slugValue || "…"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="term-name">Name</Label>
              <Input
                id="term-name"
                {...form.register("name", {
                  required: "Name is required",
                  onChange: (e) => !slugTouched && form.setValue("slug", slugify(e.target.value)),
                })}
              />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="term-slug">Slug</Label>
              <Input id="term-slug" {...form.register("slug", { onChange: () => setSlugTouched(true), setValueAs: (v: string) => slugify(v) })} />
              {original && slugValue && slugify(slugValue) !== original.slug && (
                <p className="text-xs text-amber-700">
                  Changing the slug creates a 301 redirect from {archiveBase}
                  {original.slug}.
                </p>
              )}
              {form.formState.errors.slug && <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>}
            </div>
            {kind === "category" && (
              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <div className="space-y-1.5">
                  <Label htmlFor="term-parent">Parent</Label>
                  <select id="term-parent" className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm" {...form.register("parentId", { setValueAs: (v) => v || null })}>
                    <option value="">None (top level)</option>
                    {rows
                      .filter((r) => r.id !== original?.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="term-order">Sort order</Label>
                  <Input id="term-order" type="number" min={0} {...form.register("sortOrder", { valueAsNumber: true })} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="term-desc">Description</Label>
              <Textarea id="term-desc" rows={3} {...form.register("description")} placeholder="Shown at the top of the archive page." />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="term-seo-title">SEO title</Label>
                <CharCount value={seoTitle ?? ""} max={60} />
              </div>
              <Input id="term-seo-title" {...form.register("seoTitle")} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="term-meta">Meta description</Label>
                <CharCount value={metaDescription ?? ""} min={120} max={155} />
              </div>
              <Textarea id="term-meta" rows={2} {...form.register("metaDescription")} />
            </div>
            {kind === "category" && (
              <div className="space-y-1.5">
                <Label>Social image</Label>
                <MediaField
                  label="Social image"
                  value={ogImageId}
                  media={media}
                  onChange={(m) => {
                    if (m) setMedia((prev) => new Map(prev).set(m.id, m));
                    form.setValue("ogImageId", m?.id ?? null);
                  }}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {merge && (
        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge tags</DialogTitle>
              <DialogDescription>
                Posts tagged with {[...selected].map((id) => rows.find((r) => r.id === id)?.name).join(", ")} move to the target tag. The merged tags are deleted and
                their archive URLs redirect (301) to the target.
              </DialogDescription>
            </DialogHeader>
            <select aria-label="Target tag" className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
              <option value="">Choose the tag to keep…</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.postCount})
                </option>
              ))}
            </select>
            <DialogFooter>
              <Button disabled={!mergeTarget || pending} onClick={doMerge}>
                {pending && <Loader2 className="size-4 animate-spin" />} Merge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
