"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIst } from "@/lib/time";
import { deleteRedirectAction, saveRedirectAction } from "../actions";

type RedirectRow = { id: string; fromPath: string; toPath: string; statusCode: 301 | 302; hits: number; lastHitAt: string | null; automatic: boolean };

export function RedirectsManager({ rows }: { rows: RedirectRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<RedirectRow | "new" | null>(null);
  const [form, setForm] = useState({ fromPath: "", toPath: "", statusCode: 301 as 301 | 302 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  const open = (row: RedirectRow | "new") => {
    setForm(row === "new" ? { fromPath: "", toPath: "", statusCode: 301 } : { fromPath: row.fromPath, toPath: row.toPath, statusCode: row.statusCode });
    setErrors({});
    setEditing(row);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveRedirectAction(editing && editing !== "new" ? editing.id : null, form);
      if (!res.ok) {
        toast.error(res.error);
        setErrors(res.fieldErrors ?? {});
        return;
      }
      toast.success(res.message ?? "Saved");
      setEditing(null);
      router.refresh();
    });

  const del = (row: RedirectRow) => {
    if (!window.confirm(`Delete the redirect from ${row.fromPath}?`)) return;
    startTransition(async () => {
      const res = await deleteRedirectAction(row.id);
      if (res.ok) {
        toast.success(res.message ?? "Deleted");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const visible = rows.filter((r) => !q || r.fromPath.includes(q) || r.toPath.includes(q));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by path" className="w-64 bg-white pl-8" aria-label="Filter redirects" />
        </div>
        <Button className="ml-auto" onClick={() => open("new")}>
          <Plus className="size-4" /> Add redirect
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead />
              <TableHead>To</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Hits</TableHead>
              <TableHead>Last hit</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No redirects. Slug changes on published posts, categories, tags and authors create them automatically.
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[260px] break-all font-mono text-xs text-evergreen-700">{r.fromPath}</TableCell>
                <TableCell>
                  <ArrowRight className="size-4 text-muted-foreground" aria-label="redirects to" />
                </TableCell>
                <TableCell className="max-w-[300px] break-all font-mono text-xs text-evergreen-700">{r.toPath}</TableCell>
                <TableCell className="text-sm">
                  {r.statusCode}
                  {r.automatic && <span className="ml-2 rounded-full bg-paper-2 px-2 py-0.5 text-xs text-evergreen-700">auto</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.hits}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.lastHitAt ? formatIst(r.lastHitAt) : "Never"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label={`Edit redirect from ${r.fromPath}`} onClick={() => open(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete redirect from ${r.fromPath}`} onClick={() => del(r)} disabled={pending}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add redirect" : "Edit redirect"}</DialogTitle>
            <DialogDescription>Use 301 for permanent moves (passes ranking signals) and 302 only for temporary ones.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="r-from">From path</Label>
              <Input id="r-from" value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} placeholder="/old-article" />
              {errors.fromPath && <p className="text-xs text-destructive">{errors.fromPath}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-to">To</Label>
              <Input id="r-to" value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} placeholder="/blog/new-article or https://…" />
              {errors.toPath && <p className="text-xs text-destructive">{errors.toPath}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-code">Type</Label>
              <select
                id="r-code"
                value={form.statusCode}
                onChange={(e) => setForm({ ...form, statusCode: Number(e.target.value) as 301 | 302 })}
                className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
              >
                <option value={301}>301 — permanent</option>
                <option value={302}>302 — temporary</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
