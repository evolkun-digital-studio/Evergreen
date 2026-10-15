"use client";

import { useActionState } from "react";
import { submitEprLead, type EprLeadState } from "@/app/(site)/epr-calculator/actions";

export function EprLeadForm({ snapshot }: { snapshot: Record<string, string> }) {
  const [state, action, pending] = useActionState<EprLeadState, FormData>(submitEprLead, {});
  if (state.ok) return <p role="status" className="font-semibold text-moss-soft">Thanks. Evergreen will contact you about this target.</p>;
  return <form action={action} className="grid flex-1 gap-3 sm:grid-cols-3"><input type="hidden" name="snapshot" value={JSON.stringify(snapshot)} /><input name="name" required placeholder="Name" aria-label="Name" className="field h-11" /><input name="phone" required placeholder="Phone" aria-label="Phone" className="field h-11" /><input name="email" type="email" placeholder="Email (optional)" aria-label="Email" className="field h-11" /><button disabled={pending} className="btn bg-moss text-evergreen-950 sm:col-span-3">{pending ? "Sending…" : "Request EPR support"}</button>{state.error && <p role="alert" className="text-sm text-red-200 sm:col-span-3">{state.error}</p>}</form>;
}
