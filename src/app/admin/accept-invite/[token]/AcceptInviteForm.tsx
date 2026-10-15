"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteAction, type AcceptState } from "./actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInviteAction.bind(null, token), {});
  if (state.ok) return <p className="text-sm">Your account is ready. <Link className="font-semibold text-evergreen-700 underline" href="/admin/login">Sign in</Link></p>;
  return <form action={action} className="space-y-4"><div className="space-y-2"><Label htmlFor="password">Choose password</Label><Input id="password" name="password" type="password" minLength={12} required /></div><div className="space-y-2"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" name="confirm" type="password" minLength={12} required /></div>{state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}<Button className="w-full" disabled={pending}>Accept invitation</Button></form>;
}
