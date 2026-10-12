"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { FileText, Link2, Unlink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { searchPostsForLinkAction } from "@/app/admin/(panel)/posts/actions";

type Result = { id: string; title: string; path: string };
const REL_OPTIONS = ["nofollow", "sponsored", "ugc"] as const;

export function LinkPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const [newTab, setNewTab] = useState(false);
  const [rel, setRel] = useState<string[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  const onOpenChange = (next: boolean) => {
    if (next) {
      const attrs = editor.getAttributes("link") as { href?: string; target?: string; rel?: string };
      setHref(attrs.href ?? "");
      setNewTab(attrs.target === "_blank");
      setRel((attrs.rel ?? "").split(/\s+/).filter((r) => (REL_OPTIONS as readonly string[]).includes(r)));
    }
    setOpen(next);
  };

  // Internal-link search: anything that isn't a URL is treated as a post title query.
  useEffect(() => {
    if (!open) return;
    const query = /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? "" : href;
    if (/^(https?:|mailto:|tel:)/i.test(href)) return;
    const t = setTimeout(async () => {
      const res = await searchPostsForLinkAction(query);
      if (res.ok) setResults(res.data);
    }, 200);
    return () => clearTimeout(t);
  }, [href, open]);

  const suggestions = /^(https?:|mailto:|tel:)/i.test(href) ? [] : results;

  const apply = (url = href) => {
    const value = url.trim();
    if (!value) return;
    const normalized = /^(https?:|mailto:|tel:|\/|#)/i.test(value) ? value : `https://${value}`;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized, target: newTab ? "_blank" : null, rel: rel.length ? rel.join(" ") : null })
      .run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Link (Ctrl+K)"
          aria-label="Link"
          className={cn("grid size-8 place-items-center rounded-md text-evergreen-700 hover:bg-paper-2", editor.isActive("link") && "bg-paper-2 text-moss-ink")}
        >
          <Link2 className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          className="space-y-3"
        >
          <Input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="Paste a URL or search posts…" />
          {suggestions.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-md border border-line">
              {suggestions.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => apply(r.path)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper-2">
                    <FileText className="size-4 shrink-0 text-moss-ink" />
                    <span className="min-w-0 flex-1 truncate text-evergreen-700">{r.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">internal</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={newTab} onCheckedChange={(v) => setNewTab(v === true)} /> Open in new tab
            </Label>
            {REL_OPTIONS.map((r) => (
              <Label key={r} className="flex items-center gap-2 font-normal">
                <Checkbox checked={rel.includes(r)} onCheckedChange={(v) => setRel((cur) => (v ? [...cur, r] : cur.filter((x) => x !== r)))} />
                {r}
              </Label>
            ))}
          </div>
          <div className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!editor.isActive("link")}
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setOpen(false);
              }}
            >
              <Unlink className="size-4" /> Remove
            </Button>
            <Button type="submit" size="sm" disabled={!href.trim()}>
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
