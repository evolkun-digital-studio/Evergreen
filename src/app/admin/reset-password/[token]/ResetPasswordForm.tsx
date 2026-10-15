"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type ResetState } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const action = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState<ResetState, FormData>(action, {});
  if (state.ok) return <p role="status" className="text-sm">Password updated. <Link href="/admin/login" className="font-semibold text-evergreen-700 underline">Sign in</Link></p>;
  return <form action={formAction} className="space-y-4"><div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" minLength={12} required autoFocus /></div><div className="space-y-2"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" name="confirm" type="password" minLength={12} required /></div>{state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}<Button className="w-full" disabled={pending}>Reset password</Button></form>;
}
