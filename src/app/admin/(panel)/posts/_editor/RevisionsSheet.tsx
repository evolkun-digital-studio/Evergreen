"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { History, Loader2, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatIst } from "@/lib/time";
import { diffLines } from "@/lib/diff";
import { docToText } from "@/lib/content/text";
import type { PMNode } from "@/lib/content/types";
import type { RevisionSummary } from "@/lib/posts/editor-types";
import type { PostData, PostInput } from "@/lib/validation/post";
import { getRevisionAction, listRevisionsAction } from "../actions";

const REASONS: Record<string, string> = { autosave: "Autosave", manual: "Saved", publish: "Published / updated", restore: "Restored" };

function summarize(v: Pick<PostInput, "title" | "excerpt" | "content"> & { seo: { seoTitle: string; metaDescription: string } }) {
  return [`# ${v.title}`, v.excerpt, `SEO title: ${v.seo.seoTitle}`, `Meta: ${v.seo.metaDescription}`, "", docToText(v.content as PMNode)].join("\n");
}

export function RevisionsSheet({
  postId,
  open,
  onOpenChange,
  current,
  onRestore,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: () => PostInput;
  onRestore: (snapshot: PostData) => void;
}) {
  const [items, setItems] = useState<RevisionSummary[] | null>(null);
  const [selected, setSelected] = useState<{ id: string; snapshot: PostData } | null>(null);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    if (!open) return;
    startLoading(async () => {
      const res = await listRevisionsAction(postId);
      if (res.ok) setItems(res.data);
      else toast.error(res.error);
    });
  }, [open, postId]);

  const select = (id: string) =>
    startLoading(async () => {
      const res = await getRevisionAction(id);
      if (res.ok) setSelected({ id, snapshot: res.data });
      else toast.error(res.error);
    });

  const diff = selected ? diffLines(summarize(selected.snapshot), summarize(current())) : [];

  return (
    <Sheet
      open={open}
      onOpenChange={next => {
        if (!next) setSelected(null);
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-5" /> Revision history
          </SheetTitle>
          <SheetDescription>The last 50 revisions are kept. Compare one with the current editor content, then restore it if needed.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
          <ul className="space-y-1">
            {items === null && loading && <Loader2 className="size-4 animate-spin" />}
            {items?.length === 0 && <p className="text-sm text-muted-foreground">No revisions yet.</p>}
            {items?.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => select(r.id)}
                  className={cn("w-full rounded-md px-3 py-2 text-left text-sm hover:bg-paper-2", selected?.id === r.id && "bg-paper-2 ring-1 ring-evergreen-600")}
                >
                  <span className="block font-medium text-evergreen-700">{formatIst(r.createdAt)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {REASONS[r.reason] ?? r.reason} · {r.userName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="min-w-0">
            {selected ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="rounded bg-red-50 px-1 text-red-800">− revision</span> <span className="rounded bg-emerald-50 px-1 text-emerald-800">+ current</span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onRestore(selected.snapshot);
                      onOpenChange(false);
                      toast.success("Revision restored into the editor. Save to keep it.");
                    }}
                  >
                    <RotateCcw className="size-4" /> Restore this revision
                  </Button>
                </div>
                <pre className="max-h-[70vh] overflow-auto rounded-md border border-line bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap">
                  {diff.map((l, i) => (
                    <div key={i} className={cn(l.type === "added" && "bg-emerald-50 text-emerald-900", l.type === "removed" && "bg-red-50 text-red-900")}>
                      {l.type === "added" ? "+ " : l.type === "removed" ? "− " : "  "}
                      {l.text}
                    </div>
                  ))}
                </pre>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a revision to compare.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
