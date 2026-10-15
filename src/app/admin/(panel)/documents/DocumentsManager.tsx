"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, History, Loader2, Pencil, Search, Trash2, UploadCloud } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/admin/ConfirmProvider";
import { ROLES, type Role } from "@/lib/cms/constants";
import { DOCUMENT_ACCEPT, DOCUMENT_CATEGORIES, DOCUMENT_MAX_BYTES, formatBytes, type DocumentCategory } from "@/lib/documents/constants";
import type { DocumentAccessItem, DocumentItem } from "@/lib/data/documents";
import { formatIst } from "@/lib/time";
import { cn } from "@/lib/utils";
import { deleteDocumentAction, documentAccessLogAction, setDocumentActiveAction, updateDocumentAction } from "./actions";

const selectClass = "h-9 w-full rounded-md border border-input bg-white px-2 text-sm";
const fileUrl = (id: string) => `/api/documents/${id}/file`;

/** Uploads one file with progress; `id` replaces that document's file. */
function uploadDocument(file: File, fields: { id?: string; category?: string }, onProgress: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/documents");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.onload = () => {
      let body: { error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(body.error ?? `Upload failed (${xhr.status}).`));
    };
    const form = new FormData();
    form.append("file", file);
    if (fields.id) form.append("id", fields.id);
    if (fields.category) form.append("category", fields.category);
    xhr.send(form);
  });
}

type EditForm = { title: string; description: string; category: DocumentCategory; visibleToRoles: Role[] };

export function DocumentsManager({ rows }: { rows: DocumentItem[] }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("Certificates & Licences");
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [form, setForm] = useState<EditForm>({ title: "", description: "", category: "Other", visibleToRoles: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [replacing, setReplacing] = useState<number | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const [logFor, setLogFor] = useState<DocumentItem | null>(null);
  const [log, setLog] = useState<DocumentAccessItem[] | null>(null);

  const uploadFiles = async (files: File[]) => {
    const valid = files.filter((f) => {
      if (f.size > DOCUMENT_MAX_BYTES) toast.error(`${f.name} is larger than 20 MB.`);
      return f.size <= DOCUMENT_MAX_BYTES;
    });
    if (!valid.length) return;
    setUploads(valid.map((f) => ({ name: f.name, progress: 0 })));
    const results = await Promise.allSettled(
      valid.map((file, i) =>
        uploadDocument(file, { category: uploadCategory }, (p) => setUploads((u) => u.map((x, j) => (j === i ? { ...x, progress: p } : x)))),
      ),
    );
    results.forEach((r, i) => (r.status === "rejected" ? toast.error(`${valid[i].name}: ${(r.reason as Error).message}`) : null));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    if (ok) toast.success(ok === 1 ? "Document uploaded" : `${ok} documents uploaded`);
    setUploads([]);
    router.refresh();
  };

  const openEdit = (row: DocumentItem) => {
    setForm({ title: row.title, description: row.description, category: row.category, visibleToRoles: row.visibleToRoles });
    setErrors({});
    setEditing(row);
  };

  const save = () =>
    startTransition(async () => {
      if (!editing) return;
      const res = await updateDocumentAction(editing.id, form);
      if (!res.ok) {
        toast.error(res.error);
        setErrors(res.fieldErrors ?? {});
        return;
      }
      toast.success(res.message ?? "Saved");
      setEditing(null);
      router.refresh();
    });

  const replaceFile = async (file: File | undefined) => {
    if (!file || !editing) return;
    if (file.size > DOCUMENT_MAX_BYTES) return void toast.error("File is larger than 20 MB.");
    setReplacing(0);
    try {
      await uploadDocument(file, { id: editing.id }, setReplacing);
      toast.success("File replaced");
      setEditing({ ...editing, fileName: file.name, size: file.size });
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReplacing(null);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  };

  const toggleActive = (row: DocumentItem, active: boolean) =>
    startTransition(async () => {
      const res = await setDocumentActiveAction(row.id, active);
      if (res.ok) {
        toast.success(res.message ?? "Saved");
        router.refresh();
      } else toast.error(res.error);
    });

  const del = async (row: DocumentItem) => {
    if (!(await confirm(`Delete "${row.title}"? The file and its access log are removed permanently.`))) return;
    startTransition(async () => {
      const res = await deleteDocumentAction(row.id);
      if (res.ok) {
        toast.success(res.message ?? "Deleted");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const openLog = async (row: DocumentItem) => {
    setLogFor(row);
    setLog(null);
    const res = await documentAccessLogAction(row.id);
    if (res.ok) setLog(res.data);
    else toast.error(res.error);
  };

  const needle = q.trim().toLowerCase();
  const visible = rows.filter((r) => !needle || `${r.title} ${r.fileName} ${r.category}`.toLowerCase().includes(needle));

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void uploadFiles([...e.dataTransfer.files]);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed bg-white p-6 transition-colors",
          dragging ? "border-evergreen-700 bg-paper-2" : "border-line",
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <UploadCloud className="size-8 text-evergreen-700" aria-hidden="true" />
          <div>
            <p className="font-semibold text-evergreen-950">Drop files here to upload</p>
            <p className="text-sm text-muted-foreground">PDF, JPG, PNG, DOCX or XLSX · up to 20 MB each</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Label htmlFor="upload-category" className="text-sm">Category</Label>
            <select id="upload-category" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)} className={cn(selectClass, "w-auto")}>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={uploads.length > 0}>
              {uploads.length ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Choose files
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={DOCUMENT_ACCEPT}
              className="hidden"
              data-testid="document-upload"
              onChange={(e) => {
                void uploadFiles([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </div>
          {uploads.map((u) => (
            <div key={u.name} className="w-full max-w-md text-left text-xs">
              <p className="truncate">{u.name}</p>
              <div className="mt-1 h-1.5 rounded bg-paper-2">
                <div className="h-full rounded bg-evergreen-700 transition-[width]" style={{ width: `${Math.round(u.progress * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" className="pl-8" aria-label="Search documents" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {rows.length ? "No documents match your search." : "No documents yet. Upload the first one above."}
                </TableCell>
              </TableRow>
            )}
            {visible.map((row) => (
              <TableRow key={row.id} className={cn(!row.active && "opacity-60")}>
                <TableCell className="max-w-[280px]">
                  <p className="truncate font-medium">{row.title}</p>
                  {row.description && <p className="truncate text-xs text-muted-foreground">{row.description}</p>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{row.category}</TableCell>
                <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                  <p className="truncate">{row.fileName}</p>
                  <p>{formatBytes(row.size)}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatIst(row.updatedAt)}
                  {row.uploadedBy && <span className="block">by {row.uploadedBy}</span>}
                </TableCell>
                <TableCell>
                  <Switch checked={row.active} disabled={pending} onCheckedChange={(v) => toggleActive(row, v)} aria-label={row.active ? "Deactivate" : "Activate"} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button asChild variant="ghost" size="icon" aria-label="View file">
                    <a href={fileUrl(row.id)} target="_blank" rel="noopener noreferrer"><Eye className="size-4" /></a>
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Access log" onClick={() => void openLog(row)}><History className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(row)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Delete" disabled={pending} onClick={() => void del(row)} className="text-destructive"><Trash2 className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
            <DialogDescription>{editing?.fileName} · {editing ? formatBytes(editing.size) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="d-title">Title</Label>
              <Input id="d-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={Boolean(errors.title)} />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-category">Category</Label>
              <select id="d-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DocumentCategory })} className={selectClass}>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-description">Description</Label>
              <Textarea id="d-description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Visible to</legend>
              <div className="flex flex-wrap gap-4">
                {ROLES.filter((r) => r !== "AUTHOR").map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.visibleToRoles.includes(r)}
                      onChange={(e) =>
                        setForm({ ...form, visibleToRoles: e.target.checked ? [...form.visibleToRoles, r] : form.visibleToRoles.filter((x) => x !== r) })
                      }
                    />
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
              {errors.visibleToRoles && <p className="text-xs text-destructive">{errors.visibleToRoles}</p>}
            </fieldset>
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-paper-2 p-3">
              <Button type="button" variant="outline" size="sm" disabled={replacing !== null} onClick={() => replaceRef.current?.click()}>
                {replacing !== null ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Replace file
              </Button>
              <span className="text-xs text-muted-foreground">{replacing !== null ? `Uploading… ${Math.round(replacing * 100)}%` : "Keeps the title, category and access log."}</span>
              <input ref={replaceRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={(e) => void replaceFile(e.target.files?.[0])} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logFor !== null} onOpenChange={(o) => !o && setLogFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Access log</DialogTitle>
            <DialogDescription>{logFor?.title} · latest 100 views and downloads</DialogDescription>
          </DialogHeader>
          {log === null ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : log.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nobody has opened this document yet.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto text-sm">
              {log.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{entry.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{entry.action === "download" ? "Downloaded" : "Viewed"} · {formatIst(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
