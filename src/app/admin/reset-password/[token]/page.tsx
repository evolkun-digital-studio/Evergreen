import { ResetPasswordForm } from "./ResetPasswordForm";
import { Suspense } from "react";

export default function ResetPasswordPage({ params }: PageProps<"/admin/reset-password/[token]">) {
  return <main className="grid min-h-screen place-items-center bg-paper-2 p-4"><section className="w-full max-w-md rounded-xl border border-line bg-white p-8"><h1 className="mb-6 text-2xl">Choose a new password</h1><Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-paper-2" />}><ResetForm params={params} /></Suspense></section></main>;
}

async function ResetForm({ params }: { params: PageProps<"/admin/reset-password/[token]">["params"] }) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
