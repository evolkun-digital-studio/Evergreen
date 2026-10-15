"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  return <form className="max-w-lg space-y-4 rounded-xl border border-line bg-white p-6" action={(data) => startTransition(async () => { const result = await changePasswordAction({ current: data.get("current"), password: data.get("password"), confirm: data.get("confirm") }); if (result.ok) toast.success(result.message); else toast.error(result.error); })}><div className="space-y-2"><Label htmlFor="current">Current password</Label><Input id="current" name="current" type="password" required /></div><div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" minLength={12} required /></div><div className="space-y-2"><Label htmlFor="confirm">Confirm new password</Label><Input id="confirm" name="confirm" type="password" minLength={12} required /></div><Button disabled={pending}>Change password</Button></form>;
}
