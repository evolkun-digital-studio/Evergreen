"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ForgotState } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotPasswordAction, {});
  if (state.ok) return <p role="status" className="rounded-lg bg-paper-2 p-4 text-sm">If that account exists, a reset link has been sent.</p>;
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoFocus /></div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Send reset link</Button>
      <Link href="/admin/login" className="block text-center text-sm font-semibold text-evergreen-700 hover:underline">Back to sign in</Link>
    </form>
  );
}
