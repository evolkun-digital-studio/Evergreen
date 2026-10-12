"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Search, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { pickVariantUrl, type MediaItem } from "@/lib/media/types";
import { listMediaAction, updateMediaAction } from "@/app/admin/(panel)/media/actions";
import { ACCEPTED_TYPES, uploadMedia } from "./upload";

type PickMedia = () => Promise<MediaItem | null>;
const MediaPickerContext = createContext<PickMedia | null>(null);

export function useMediaPicker(): PickMedia {
  const ctx = useContext(MediaPickerContext);
  if (!ctx) throw new Error("useMediaPicker must be used inside <MediaPickerProvider>");
  return ctx;
}

/** Provides `pickMedia()`, which opens the library and resolves with the chosen item (or null). */
export function MediaPickerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const resolver = useRef<((m: MediaItem | null) => void) | null>(null);

  const pickMedia = useCallback<PickMedia>(
    () =>
      new Promise((resolve) => {
        resolver.current?.(null);
        resolver.current = resolve;
        setOpen(true);
      }),
    [],
  );

  const finish = (item: MediaItem | null) => {
    resolver.current?.(item);
    resolver.current = null;
    setOpen(false);
  };

  return (
    <MediaPickerContext.Provider value={pickMedia}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && finish(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
          {open && <PickerBody onDone={finish} />}
        </DialogContent>
      </Dialog>
    </MediaPickerContext.Provider>
  );
}

function PickerBody({ onDone }: { onDone: (m: MediaItem | null) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [alt, setAlt] = useState("");
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback((query: string) => {
    startLoading(async () => {
      const res = await listMediaAction({ q: query, perPage: 60 });
      if (res.ok) setItems(res.data.items);
      else toast.error(res.error);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  const choose = (m: MediaItem) => {
    setSelected(m);
    setAlt(m.alt);
  };

  async function onFiles(files: FileList | File[]) {
    const list = Array.from(files);
    setUploads(list.map((f) => ({ name: f.name, progress: 0 })));
    const done: MediaItem[] = [];
    await Promise.all(
      list.map(async (file, i) => {
        try {
          const media = await uploadMedia(file, (p) => setUploads((u) => u.map((x, j) => (j === i ? { ...x, progress: p } : x))));
          done.push(media);
        } catch (e) {
          toast.error(`${file.name}: ${(e as Error).message}`);
        }
      }),
    );
    setUploads([]);
    if (done.length) {
      setItems((prev) => [...done, ...prev]);
      choose(done[0]);
    }
  }

  const confirm = () => {
    if (!selected) return;
    if (!alt.trim() && selected.mimeType !== "image/svg+xml") {
      toast.error("Add alt text before inserting the image.");
      return;
    }
    startSaving(async () => {
      if (alt !== selected.alt) {
        const res = await updateMediaAction(selected.id, { alt, title: selected.title, caption: selected.caption, description: selected.description });
        if (!res.ok) return void toast.error(res.error);
        onDone(res.data);
      } else onDone(selected);
    });
  };

  return (
    <div
      className="flex max-h-[90vh] flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) void onFiles(e.dataTransfer.files);
      }}
    >
      <DialogHeader className="border-b border-line p-5">
        <DialogTitle>Media Library</DialogTitle>
        <DialogDescription>Choose an image or drop files here to upload.</DialogDescription>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, alt text or caption" className="pl-8" />
          </div>
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload className="size-4" /> Upload
          </Button>
          <input ref={fileInput} type="file" accept={ACCEPTED_TYPES} multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
        </div>
        {uploads.map((u) => (
          <div key={u.name} className="mt-2 text-xs text-muted-foreground">
            {u.name} — {Math.round(u.progress * 100)}%
            <div className="mt-1 h-1 rounded bg-paper-2">
              <div className="h-1 rounded bg-evergreen-700 transition-all" style={{ width: `${u.progress * 100}%` }} />
            </div>
          </div>
        ))}
      </DialogHeader>

      <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_280px]">
        <div className="min-h-[320px] overflow-y-auto p-5">
          {loading && !items.length ? (
            <div className="grid h-40 place-items-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : items.length ? (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => choose(m)}
                    onDoubleClick={() => onDone(m)}
                    aria-pressed={selected?.id === m.id}
                    className={cn(
                      "group relative block aspect-square w-full overflow-hidden rounded-md border bg-paper-2",
                      selected?.id === m.id ? "border-evergreen-600 ring-2 ring-evergreen-600" : "border-line",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pickVariantUrl(m, 320)} alt={m.alt} loading="lazy" className="size-full object-cover" />
                    {selected?.id === m.id && (
                      <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-evergreen-700 text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                    {!m.alt && m.mimeType !== "image/svg+xml" && (
                      <span className="absolute bottom-1 left-1 rounded bg-destructive px-1 text-[10px] font-medium text-white">No alt</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No images found. Upload one to get started.</p>
          )}
        </div>
        <aside className="border-t border-line bg-paper p-5 md:border-l md:border-t-0">
          {selected ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pickVariantUrl(selected, 640)} alt="" className="w-full rounded-md border border-line" />
              <p className="break-all text-xs text-muted-foreground">
                {selected.originalName} · {selected.width}×{selected.height}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="picker-alt">Alt text</Label>
                <Input id="picker-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" />
                <p className="text-xs text-muted-foreground">Saved to the library so it&apos;s reused next time.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select an image to see its details.</p>
          )}
        </aside>
      </div>

      <DialogFooter className="border-t border-line p-4">
        <Button type="button" variant="ghost" onClick={() => onDone(null)}>
          Cancel
        </Button>
        <Button type="button" disabled={!selected || saving} onClick={confirm}>
          {saving && <Loader2 className="size-4 animate-spin" />} Use image
        </Button>
      </DialogFooter>
    </div>
  );
}
