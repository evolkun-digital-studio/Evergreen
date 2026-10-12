"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Copy, Grid2x2, List, Loader2, Search, Trash2, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatIst } from "@/lib/time";
import { pickVariantUrl, type MediaItem } from "@/lib/media/types";
import type { MediaUsage } from "@/lib/data/media";
import { ACCEPTED_TYPES, formatBytes, uploadMedia } from "@/components/admin/media/upload";
import { deleteMediaAction, listMediaAction, mediaUsageAction, updateMediaAction } from "./actions";

type Filters = { q: string; type: "all" | "image" | "svg" | "gif"; unused: boolean; missingAlt: boolean };
const absolute = (url: string) => (url.startsWith("/") ? `${window.location.origin}${url}` : url);

export function MediaLibrary({ initial }: { initial: { items: MediaItem[]; total: number; pages: number } }) {
  const [items, setItems] = useState(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [pages, setPages] = useState(initial.pages);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<Filters>({ q: "", type: "all", unused: false, missingAlt: false });
  const [loading, startLoading] = useTransition();
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState<MediaItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const firstRun = useRef(true);

  const load = useCallback((f: Filters, p: number) => {
    startLoading(async () => {
      const res = await listMediaAction({ ...f, page: p, perPage: 40 });
      if (!res.ok) return void toast.error(res.error);
      setItems(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    });
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => load(filters, page), 250);
    return () => clearTimeout(t);
  }, [filters, page, load]);

  const onFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    setUploads(list.map((f) => ({ name: f.name, progress: 0 })));
    let ok = 0;
    // Three at a time keeps sharp from saturating the server.
    for (let i = 0; i < list.length; i += 3) {
      await Promise.all(
        list.slice(i, i + 3).map(async (file, k) => {
          const idx = i + k;
          try {
            const m = await uploadMedia(file, (p) => setUploads((u) => u.map((x, j) => (j === idx ? { ...x, progress: p } : x))));
            setItems((cur) => [m, ...cur]);
            ok++;
          } catch (e) {
            toast.error(`${file.name}: ${(e as Error).message}`);
          }
        }),
      );
    }
    setUploads([]);
    if (ok) {
      toast.success(`${ok} file${ok > 1 ? "s" : ""} uploaded. Add alt text to each.`);
      setTotal((t) => t + ok);
    }
  };

  const missingAltCount = items.filter((m) => !m.alt && m.mimeType !== "image/svg+xml").length;

  return (
    <div
      className="space-y-4"
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void onFiles(e.dataTransfer.files);
      }}
    >
      <div
        className={cn(
          "grid place-items-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-evergreen-600 bg-evergreen-700/10" : "border-line bg-white",
        )}
      >
        <Upload className="size-6 text-moss-ink" />
        <p className="mt-2 text-sm text-evergreen-700">Drop images here, or</p>
        <Button type="button" size="sm" className="mt-2" onClick={() => fileInput.current?.click()}>
          Choose files
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP, AVIF, GIF or SVG. AVIF and WebP versions are generated at 320–1920px automatically.</p>
        <input ref={fileInput} type="file" multiple accept={ACCEPTED_TYPES} hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
        {uploads.length > 0 && (
          <ul className="mt-4 w-full max-w-md space-y-2 text-left">
            {uploads.map((u, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {u.name} — {u.progress < 1 ? `${Math.round(u.progress * 100)}%` : "processing…"}
                <div className="mt-1 h-1 rounded bg-paper-2">
                  <div className="h-1 rounded bg-evergreen-700 transition-all" style={{ width: `${u.progress * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Search media"
            value={filters.q}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, q: e.target.value }));
            }}
            placeholder="Search name, alt, caption"
            className="w-64 bg-white pl-8"
          />
        </div>
        <select
          aria-label="File type"
          value={filters.type}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, type: e.target.value as Filters["type"] }));
          }}
          className="h-9 rounded-md border border-input bg-white px-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="image">Photos (JPG/PNG/WebP/AVIF)</option>
          <option value="gif">GIF</option>
          <option value="svg">SVG</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-evergreen-700">
          <input type="checkbox" checked={filters.unused} onChange={(e) => setFilters((f) => ({ ...f, unused: e.target.checked }))} /> Unused only
        </label>
        <label className="flex items-center gap-2 text-sm text-evergreen-700">
          <input type="checkbox" checked={filters.missingAlt} onChange={(e) => setFilters((f) => ({ ...f, missingAlt: e.target.checked }))} /> Missing alt text
        </label>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex gap-1">
          <Button variant={view === "grid" ? "default" : "ghost"} size="icon" aria-label="Grid view" onClick={() => setView("grid")}>
            <Grid2x2 className="size-4" />
          </Button>
          <Button variant={view === "list" ? "default" : "ghost"} size="icon" aria-label="List view" onClick={() => setView("list")}>
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {missingAltCount > 0 && !filters.missingAlt && (
        <p className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="size-4" /> {missingAltCount} image{missingAltCount > 1 ? "s" : ""} on this page {missingAltCount > 1 ? "have" : "has"} no alt text.
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-line bg-white py-16 text-center text-sm text-muted-foreground">No files match.</p>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setActive(m)} className="group block w-full overflow-hidden rounded-lg border border-line bg-white text-left hover:border-evergreen-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pickVariantUrl(m, 320)} alt={m.alt} loading="lazy" className="aspect-square w-full bg-paper-2 object-cover" />
                <span className="flex items-center gap-1 truncate px-2 py-1.5 text-xs text-evergreen-700">
                  {!m.alt && m.mimeType !== "image/svg+xml" && <AlertTriangle className="size-3 shrink-0 text-amber-600" aria-label="Missing alt text" />}
                  <span className="truncate">{m.originalName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16" />
                <TableHead>File</TableHead>
                <TableHead>Alt text</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() => setActive(m)}>
                  <TableCell>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pickVariantUrl(m, 320)} alt="" className="size-10 rounded object-cover" />
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm font-medium text-evergreen-700">{m.originalName}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm">{m.alt || <span className="text-amber-700">Missing</span>}</TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {m.width}×{m.height}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{formatBytes(m.sizeBytes)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatIst(m.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} files</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      <MediaDetails
        key={active?.id ?? "none"}
        item={active}
        onClose={() => setActive(null)}
        onSaved={(m) => {
          setItems((cur) => cur.map((x) => (x.id === m.id ? m : x)));
          setActive(m);
        }}
        onDeleted={(id) => {
          setItems((cur) => cur.filter((x) => x.id !== id));
          setTotal((t) => t - 1);
          setActive(null);
        }}
      />
    </div>
  );
}

function MediaDetails({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: MediaItem | null;
  onClose: () => void;
  onSaved: (m: MediaItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [meta, setMeta] = useState(() =>
    item ? { alt: item.alt, title: item.title, caption: item.caption, description: item.description } : { alt: "", title: "", caption: "", description: "" },
  );
  const [usage, setUsage] = useState<MediaUsage[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!item) return;
    void mediaUsageAction(item.id).then((res) => res.ok && setUsage(res.data));
  }, [item]);

  if (!item) return null;
  const variants = Object.entries(item.variants).flatMap(([fmt, list]) => (list ?? []).map((v) => ({ fmt, ...v })));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="break-all">{item.originalName}</SheetTitle>
          <SheetDescription>
            {item.width}×{item.height} · {formatBytes(item.sizeBytes)} · {item.mimeType} · stored on {item.storageDriver}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pickVariantUrl(item, 960)} alt={item.alt} className="w-full rounded-md border border-line bg-paper-2" />
          <div className="flex gap-2">
            <Input readOnly value={item.url} aria-label="File URL" className="text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy URL"
              onClick={() => {
                void navigator.clipboard.writeText(absolute(item.url));
                toast.success("URL copied");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-alt">Alt text</Label>
            <Textarea id="m-alt" rows={2} value={meta.alt} onChange={(e) => setMeta({ ...meta, alt: e.target.value })} aria-invalid={!meta.alt} placeholder="Describe what the image shows" />
            {!meta.alt && item.mimeType !== "image/svg+xml" && <p className="text-xs text-amber-700">Missing alt text hurts accessibility and image SEO.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-title">Title</Label>
            <Input id="m-title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-caption">Caption</Label>
            <Input id="m-caption" value={meta.caption} onChange={(e) => setMeta({ ...meta, caption: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Description</Label>
            <Textarea id="m-desc" rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateMediaAction(item.id, meta);
                if (res.ok) {
                  toast.success(res.message ?? "Saved");
                  onSaved(res.data);
                } else toast.error(res.error);
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />} Save details
          </Button>

          {variants.length > 0 && (
            <details className="rounded-md border border-line p-3 text-xs">
              <summary className="cursor-pointer font-medium text-evergreen-700">{variants.length} generated variants</summary>
              <ul className="mt-2 space-y-1">
                {variants.map((v) => (
                  <li key={`${v.fmt}-${v.width}`} className="flex justify-between gap-2">
                    <a href={v.url} target="_blank" rel="noopener" className="text-moss-ink underline">
                      {v.fmt} {v.width}w
                    </a>
                    <span className="tabular-nums text-muted-foreground">{formatBytes(v.size)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <section className="rounded-md border border-line p-3">
            <h3 className="text-sm font-medium text-evergreen-700">Used in</h3>
            {usage === null ? (
              <Loader2 className="mt-2 size-4 animate-spin" />
            ) : usage.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {usage.map((u) => (
                  <li key={`${u.kind}-${u.id}`}>
                    <Link href={u.href} className="text-moss-ink underline">
                      {u.label}
                    </Link>{" "}
                    <span className="text-xs text-muted-foreground">({u.kind})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Not used anywhere.</p>
            )}
          </section>

          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive"
            disabled={pending || usage === null || usage.length > 0}
            title={usage?.length ? "Remove it from the items above first" : undefined}
            onClick={() => {
              if (!window.confirm("Delete this file and all its variants?")) return;
              startTransition(async () => {
                const res = await deleteMediaAction(item.id);
                if (res.ok) {
                  toast.success(res.message ?? "Deleted");
                  onDeleted(item.id);
                } else toast.error(res.error);
              });
            }}
          >
            <Trash2 className="size-4" /> {usage?.length ? "In use — can't delete" : "Delete file"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
