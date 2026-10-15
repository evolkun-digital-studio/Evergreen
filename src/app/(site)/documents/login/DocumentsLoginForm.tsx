"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, LockKeyhole } from "lucide-react";
import { documentsLoginAction, type DocumentsLoginState } from "./actions";

const inputClass =
  "h-11 w-full rounded-[8px] border border-line bg-white px-3 text-[15px] text-ink outline-none transition-colors focus-visible:border-evergreen-700 focus-visible:ring-2 focus-visible:ring-evergreen-700/20";

export function DocumentsLoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/documents";
  const denied = params.get("denied") === "1";
  const [state, formAction, pending] = useActionState<DocumentsLoginState, FormData>(documentsLoginAction, {});
  const error = state.error ?? (denied ? "This account doesn't have access to documents." : undefined);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-semibold text-evergreen-950">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus className={inputClass} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="password" className="block text-sm font-semibold text-evergreen-950">Password</label>
          <Link href="/admin/forgot-password" className="text-xs font-semibold text-evergreen-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      {error && (
        <p role="alert" className="rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-evergreen-700 font-display text-[14px] font-semibold text-white transition-colors hover:bg-evergreen-800 disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="size-4" aria-hidden="true" />}
        Sign in
      </button>
    </form>
  );
}
