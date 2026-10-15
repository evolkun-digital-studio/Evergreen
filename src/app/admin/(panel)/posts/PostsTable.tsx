"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink, MoreHorizontal, Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScoreBadge, StatusBadge } from "@/components/admin/ScoreBadge";
import { formatIst } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { PostRow } from "@/lib/data/admin-posts";
import type { Option } from "@/lib/posts/editor-types";
import { bulkPostAction, duplicatePostAction } from "./actions";
import { useConfirm } from "@/components/admin/ConfirmProvider";

type Props = {
  rows: PostRow[];
  total: number;
  page: number;
  pages: number;
  tally: Record<string, number>;
  filters: { categories: Option[]; authors: Option[]; tags: Option[] };
  canPublish: boolean;
};

const selectClass = "h-9 rounded-md border border-input bg-white px-2 text-sm text-evergreen-700";

export function PostsTable({ rows, total, page, pages, tally, filters, canPublish }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const trash = params.get("view") === "trash";
  const confirm = useConfirm();

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in updates)) next.delete("page");
    setSelected(new Set());
    router.push(`${pathname}?${next.toString()}`);
  };

  const run = async (action: string, ids: string[], confirmText?: string) => {
    if (!ids.length) return;
    if (confirmText && !(await confirm(confirmText))) return;
    startTransition(async () => {
      const res = await bulkPostAction(action, ids);
      if (res.ok) {
        toast.success(res.data);
        setSelected(new Set());
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const duplicate = (id: string) =>
    startTransition(async () => {
      const res = await duplicatePostAction(id);
      if (res.ok) router.push(`/admin/posts/${res.data}`);
      else toast.error(res.error);
    });

  const views: { key: string | null; label: string; count: number }[] = [
    { key: null, label: "All", count: tally.all ?? 0 },
    { key: "PUBLISHED", label: "Published", count: tally.PUBLISHED ?? 0 },
    { key: "DRAFT", label: "Drafts", count: tally.DRAFT ?? 0 },
    { key: "SCHEDULED", label: "Scheduled", count: tally.SCHEDULED ?? 0 },
  ];
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const ids = [...selected];

  return (
    <div className="space-y-4">
      <nav aria-label="Post views" className="flex flex-wrap gap-1 text-sm">
        {views.map((v) => {
          const active = !trash && (params.get("status") ?? null) === v.key;
          return (
            <button
              key={v.label}
              type="button"
              onClick={() => setParam({ status: v.key, view: null })}
              className={cn("rounded-md px-3 py-1.5", active ? "bg-evergreen-700 text-white" : "text-evergreen-700 hover:bg-paper-2")}
            >
              {v.label} <span className="opacity-70">({v.count})</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setParam({ view: "trash", status: null })}
          className={cn("rounded-md px-3 py-1.5", trash ? "bg-destructive text-white" : "text-evergreen-700 hover:bg-paper-2")}
        >
          Trash <span className="opacity-70">({tally.trash ?? 0})</span>
        </button>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: q.trim() || null });
          }}
        >
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, slug, keyword" className="w-64 bg-white pl-8" aria-label="Search posts" />
        </form>
        <select aria-label="Filter by category" className={selectClass} value={params.get("category") ?? ""} onChange={(e) => setParam({ category: e.target.value || null })}>
          <option value="">All categories</option>
          {filters.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter by author" className={selectClass} value={params.get("author") ?? ""} onChange={(e) => setParam({ author: e.target.value || null })}>
          <option value="">All authors</option>
          {filters.authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter by tag" className={selectClass} value={params.get("tag") ?? ""} onChange={(e) => setParam({ tag: e.target.value || null })}>
          <option value="">All tags</option>
          {filters.tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select aria-label="Sort" className={selectClass} value={params.get("sort") ?? "updated"} onChange={(e) => setParam({ sort: e.target.value === "updated" ? null : e.target.value })}>
          <option value="updated">Last updated</option>
          <option value="published">Publish date</option>
          <option value="title">Title A–Z</option>
          <option value="score">SEO score</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-evergreen-600/40 bg-evergreen-700/10 px-3 py-2 text-sm text-evergreen-700">
          <strong>{selected.size} selected</strong>
          {trash ? (
            <>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run("restore", ids)}>
                <RotateCcw className="size-4" /> Restore
              </Button>
              {canPublish && (
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("delete", ids, `Permanently delete ${ids.length} post(s)? This cannot be undone.`)}>
                  <Trash2 className="size-4" /> Delete permanently
                </Button>
              )}
            </>
          ) : (
            <>
              {canPublish && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run("publish", ids, `Publish ${ids.length} post(s) now?`)}>
                  Publish
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run("draft", ids)}>
                Move to draft
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run("trash", ids)}>
                <Trash2 className="size-4" /> Move to trash
              </Button>
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all"
                  checked={allChecked}
                  onCheckedChange={(v) => setSelected(v ? new Set(rows.filter((r) => r.editable).map((r) => r.id)) : new Set())}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-center">SEO</TableHead>
              <TableHead className="text-center">AEO</TableHead>
              <TableHead className="text-center">GEO</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                  {trash ? "Trash is empty." : "No posts match these filters."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${r.title}`}
                    disabled={!r.editable}
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) =>
                      setSelected((cur) => {
                        const next = new Set(cur);
                        if (v) next.add(r.id);
                        else next.delete(r.id);
                        return next;
                      })
                    }
                  />
                </TableCell>
                <TableCell className="max-w-[360px]">
                  {r.editable && !trash ? (
                    <Link href={`/admin/posts/${r.id}`} className="block truncate font-medium text-evergreen-700 hover:underline">
                      {r.title}
                    </Link>
                  ) : (
                    <span className="block truncate font-medium text-evergreen-700">{r.title}</span>
                  )}
                  <span className="block truncate text-xs text-muted-foreground">
                    /blog/{r.slug} · {r.wordCount.toLocaleString("en-IN")} words
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm">{r.category ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-sm">{r.author}</TableCell>
                <TableCell className="text-center">
                  <ScoreBadge score={r.seoScore} label="SEO" />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreBadge score={r.aeoScore} label="AEO" />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreBadge score={r.geoScore} label="GEO" />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {r.status === "PUBLISHED" && r.publishedAt
                    ? `Published ${formatIst(r.publishedAt)}`
                    : r.status === "SCHEDULED" && r.scheduledFor
                      ? `Scheduled ${formatIst(r.scheduledFor)}`
                      : `Updated ${formatIst(r.updatedAt)}`}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions for ${r.title}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {trash ? (
                        <>
                          <DropdownMenuItem disabled={!r.editable} onSelect={() => run("restore", [r.id])}>
                            <RotateCcw className="size-4" /> Restore
                          </DropdownMenuItem>
                          {canPublish && (
                            <DropdownMenuItem className="text-destructive" onSelect={() => run("delete", [r.id], `Permanently delete “${r.title}”? This cannot be undone.`)}>
                              <Trash2 className="size-4" /> Delete permanently
                            </DropdownMenuItem>
                          )}
                        </>
                      ) : (
                        <>
                          {r.editable && (
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/posts/${r.id}`}>
                                <Pencil className="size-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {r.status === "PUBLISHED" && (
                            <DropdownMenuItem asChild>
                              <a href={`/blog/${r.slug}`} target="_blank" rel="noopener">
                                <ExternalLink className="size-4" /> View
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => duplicate(r.id)}>
                            <Copy className="size-4" /> Duplicate
                          </DropdownMenuItem>
                          {r.editable && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => run("trash", [r.id])}>
                                <Trash2 className="size-4" /> Move to trash
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} post{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>
            Previous
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setParam({ page: String(page + 1) })}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
