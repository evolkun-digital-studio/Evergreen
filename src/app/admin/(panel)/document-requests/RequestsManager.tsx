"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/admin/ConfirmProvider";
import type { RequestItem } from "@/lib/data/document-requests";
import { DEFAULT_EXPIRY_DAYS, EXPIRY_DAYS, type GrantScope } from "@/lib/documents/grant";
import { formatIst } from "@/lib/time";
import { cn } from "@/lib/utils";
import { approveRequestAction, rejectRequestAction, resendRequestAction, revokeRequestAction, type Delivery } from "./actions";

type DocOption = { id: string; title: string; category: string };

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "valid", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "revoked", label: "Revoked" },
  { key: "expired", label: "Expired" },
  { key: "all", label: "All" },
] as const;

const STATE_LABEL: Record<RequestItem["state"], string> = {
  pending: "Pending",
  valid: "Approved",
  expired: "Expired",
  revoked: "Revoked",
  rejected: "Rejected",
};

const selectClass = "h-9 rounded-md border border-input bg-white px-2 text-sm";

const requestedText = (r: RequestItem) => {
  if (r.requestedScope === "selected") return r.requestedDocuments.map((d) => d.title).join(", ");
  if (r.requestedCategories.length || r.requestedDetails) return "No specific files";
  return "Whole library";
};

const grantedText = (r: RequestItem) =>
  r.grantScope === "all" ? "Whole library" : r.grantedDocuments.map((d) => d.title).join(", ");

export function RequestsManager({ rows, documents }: { rows: RequestItem[]; documents: DocOption[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("pending");

  const [approving, setApproving] = useState<RequestItem | null>(null);
  const [scope, setScope] = useState<GrantScope>("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [expiryDays, setExpiryDays] = useState<number>(DEFAULT_EXPIRY_DAYS);

  const [rejecting, setRejecting] = useState<RequestItem | null>(null);
  const [note, setNote] = useState("");

  // Shown when the approval email could not be sent: the link exists only in this response.
  const [manualLink, setManualLink] = useState<{ email: string; link: string } | null>(null);

  const visible = rows.filter((r) => filter === "all" || (filter === "pending" ? r.state === "pending" : r.state === filter));

  const run = (work: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      const res = await work();
      if (res.ok) toast.success(res.message ?? "Saved");
      else toast.error(res.error ?? "Something went wrong");
      after?.();
      router.refresh();
    });

  /** Runs an action that emails a link; if the email did not go out, hands the link to the admin instead. */
  const runDelivery = (email: string, work: () => Promise<{ ok: true; data: Delivery } | { ok: false; error: string }>, after?: () => void) =>
    startTransition(async () => {
      const res = await work();
      if (!res.ok) toast.error(res.error);
      else if (res.data.emailed) toast.success("Link emailed to the requester");
      else setManualLink({ email, link: res.data.link });
      after?.();
      router.refresh();
    });

  const copyLink = async () => {
    if (!manualLink) return;
    try {
      await navigator.clipboard.writeText(manualLink.link);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  };

  const openApprove = (r: RequestItem) => {
    // Pre-tick what was asked for: the files they picked, plus every file under the types they chose.
    const wanted = new Set([
      ...r.requestedDocuments.map((d) => d.id),
      ...documents.filter((d) => (r.requestedCategories as string[]).includes(d.category)).map((d) => d.id),
    ]);
    const ticked = documents.filter((d) => wanted.has(d.id)).map((d) => d.id);
    setScope(ticked.length ? "selected" : "all");
    setPicked(ticked);
    setExpiryDays(DEFAULT_EXPIRY_DAYS);
    setApproving(r);
  };

  const approve = () => {
    if (!approving) return;
    runDelivery(
      approving.email,
      () => approveRequestAction(approving.id, { scope, documentIds: scope === "selected" ? picked : [], expiryDays }),
      () => setApproving(null),
    );
  };

  const reject = () => {
    if (!rejecting) return;
    run(() => rejectRequestAction(rejecting.id, note), () => setRejecting(null));
  };

  const revoke = async (r: RequestItem) => {
    if (!(await confirm(`Revoke access for ${r.email}? Their link stops working immediately.`))) return;
    run(() => revokeRequestAction(r.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter requests">
        {FILTERS.map((f) => {
          const count = rows.filter((r) => f.key === "all" || r.state === f.key).length;
          return (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label} ({count})
            </Button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No requests here.
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[280px] align-top">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  {r.company && <p className="truncate text-xs text-muted-foreground">{r.company}</p>}
                  {r.purpose && <p className="mt-1 line-clamp-3 text-xs">{r.purpose}</p>}
                </TableCell>
                <TableCell className="max-w-[240px] align-top text-sm">
                  <p>{requestedText(r)}</p>
                  {r.requestedCategories.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Types: {r.requestedCategories.join(", ")}</p>
                  )}
                  {r.requestedDetails && <p className="mt-1 text-xs">Looking for: {r.requestedDetails}</p>}
                  {r.grantScope && grantedText(r) !== requestedText(r) && (
                    <p className="mt-1 text-xs text-muted-foreground">Granted: {grantedText(r)}</p>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap align-top text-sm">
                  <span className={cn("font-medium", r.state === "valid" && "text-evergreen-700", (r.state === "revoked" || r.state === "rejected") && "text-destructive")}>
                    {STATE_LABEL[r.state]}
                  </span>
                  {r.expiresAt && r.state === "valid" && <span className="block text-xs text-muted-foreground">until {formatIst(r.expiresAt)}</span>}
                  {r.decisionNote && <span className="block max-w-[180px] truncate text-xs text-muted-foreground">{r.decisionNote}</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">{formatIst(r.createdAt)}</TableCell>
                <TableCell className="whitespace-nowrap text-right align-top">
                  {r.state === "pending" && (
                    <>
                      <Button size="sm" disabled={pending} onClick={() => openApprove(r)}>Approve</Button>{" "}
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => { setNote(""); setRejecting(r); }}>Reject</Button>
                    </>
                  )}
                  {r.state === "valid" && (
                    <>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => runDelivery(r.email, () => resendRequestAction(r.id))}>Resend link</Button>{" "}
                      <Button size="sm" variant="outline" disabled={pending} className="text-destructive" onClick={() => void revoke(r)}>Revoke</Button>
                    </>
                  )}
                  {(r.state === "expired" || r.state === "revoked" || r.state === "rejected") && (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => openApprove(r)}>Approve again</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={approving !== null} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve access</DialogTitle>
            <DialogDescription>
              {approving?.name} · {approving?.email}. They are emailed a private link to what you choose below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">What to share</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} /> Whole library (includes future uploads)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scope" checked={scope === "selected"} onChange={() => setScope("selected")} /> Selected documents
              </label>
            </fieldset>
            {scope === "selected" && (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-line p-3">
                {documents.map((d) => (
                  <li key={d.id}>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={picked.includes(d.id)}
                        onChange={(e) => setPicked(e.target.checked ? [...picked, d.id] : picked.filter((x) => x !== d.id))}
                      />
                      <span>{d.title} <span className="text-xs text-muted-foreground">· {d.category}</span></span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <Label htmlFor="expiry" className="text-sm">Link valid for</Label>
              <select id="expiry" value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))} className={selectClass}>
                {EXPIRY_DAYS.map((d) => (
                  <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)}>Cancel</Button>
            <Button onClick={approve} disabled={pending || (scope === "selected" && picked.length === 0)}>
              {pending && <Loader2 className="size-4 animate-spin" />} Approve and email link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualLink !== null} onOpenChange={(o) => !o && setManualLink(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approved. Send the link yourself</DialogTitle>
            <DialogDescription>
              The email to {manualLink?.email} could not be sent (email delivery is not set up, or the provider refused it). The request is approved. Copy this link and pass it on. It is shown only now; Resend link makes a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={manualLink?.link ?? ""} aria-label="Access link" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={() => void copyLink()}>
              <Copy className="size-4" /> Copy
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setManualLink(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejecting !== null} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>{rejecting?.name} is emailed a polite decline. The note is optional and is included in that email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Note</Label>
            <Textarea id="reject-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
