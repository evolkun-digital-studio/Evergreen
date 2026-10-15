"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ROLES, type Role } from "@/lib/cms/constants";
import { formatIst } from "@/lib/time";
import type { Option } from "@/lib/posts/editor-types";
import { inviteUserAction, resendInviteAction, revokeInviteAction, updateUserAction } from "./actions";

type UserRow = { id: string; name: string; email: string; role: Role; active: boolean; authorId: string | null; lastLoginAt: string | null };
type InviteRow = { id: string; name: string; email: string; role: Role; expiresAt: string };

const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Everything, including settings and users",
  EDITOR: "All posts, can publish; taxonomy, media, authors, SEO tools",
  AUTHOR: "Own drafts only; cannot publish",
  VIEWER: "Documents library only; no CMS access",
};
const selectClass = "h-9 w-full rounded-md border border-input bg-white px-2 text-sm";

export function UsersManager({ rows, authors, currentUserId, invites }: { rows: UserRow[]; authors: Option[]; currentUserId: string; invites: InviteRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const done = (res: { ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> }) => {
    if (!res.ok) {
      toast.error(res.error);
      setErrors(res.fieldErrors ?? {});
      return;
    }
    toast.success(res.message ?? "Saved");
    setErrors({});
    setCreating(false);
    setEditing(null);
    router.refresh();
  };

  const create = (fd: FormData) =>
    startTransition(async () =>
      done(await inviteUserAction({ name: fd.get("name"), email: fd.get("email"), role: fd.get("role") })),
    );

  const update = (fd: FormData) => {
    if (!editing) return;
    startTransition(async () =>
      done(
        await updateUserAction(editing.id, {
          name: fd.get("name"),
          role: fd.get("role"),
          active: fd.get("active") === "on",
          authorId: fd.get("authorId") || null,
          password: fd.get("password") ?? "",
        }),
      ),
    );
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Invite user
        </Button>
      </div>
      {invites.length > 0 && (
        <section className="rounded-xl border border-line bg-white p-4">
          <h2 className="font-display text-lg font-semibold text-evergreen-700">Pending invitations</h2>
          <ul className="mt-3 divide-y divide-line">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1"><strong>{invite.name}</strong><span className="block text-muted-foreground">{invite.email} · {invite.role.toLowerCase()}</span></span>
                <Button variant="outline" size="sm" onClick={() => startTransition(async () => done(await resendInviteAction(invite.id)))}>Resend</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => startTransition(async () => done(await revokeInviteAction(invite.id)))}>Revoke</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-evergreen-700">
                  {u.name}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell className="text-sm">{u.role.charAt(0) + u.role.slice(1).toLowerCase()}</TableCell>
                <TableCell className="text-sm">{u.active ? <span className="text-moss-ink">Active</span> : <span className="text-muted-foreground">Deactivated</span>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.lastLoginAt ? formatIst(u.lastLoginAt) : "Never"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>They’ll receive a secure link to choose their password. An author profile is created when they accept.</DialogDescription>
          </DialogHeader>
          <form action={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Name</Label>
              <Input id="u-name" name="name" required />
              {err("name")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" name="email" type="email" required autoComplete="off" />
              {err("email")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Role</Label>
              <select id="u-role" name="role" defaultValue="AUTHOR" className={selectClass}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()} — {ROLE_HELP[r]}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />} Send invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form action={update} className="space-y-4" key={editing.id}>
              <div className="space-y-1.5">
                <Label htmlFor="e-name">Name</Label>
                <Input id="e-name" name="name" defaultValue={editing.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-role">Role</Label>
                <select id="e-role" name="role" defaultValue={editing.role} className={selectClass}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0) + r.slice(1).toLowerCase()} — {ROLE_HELP[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-author">Author profile</Label>
                <select id="e-author" name="authorId" defaultValue={editing.authorId ?? ""} className={selectClass}>
                  <option value="">None</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-pass">New password</Label>
                <Input id="e-pass" name="password" type="password" placeholder="Leave empty to keep the current password" autoComplete="new-password" />
                {err("password")}
              </div>
              <label className="flex items-center justify-between rounded-lg border border-line p-3 text-sm">
                Active (can sign in)
                <Switch name="active" defaultChecked={editing.active} />
              </label>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
