import { AcceptInviteForm } from "./AcceptInviteForm";
import { Suspense } from "react";

export default function AcceptInvitePage({ params }: PageProps<"/admin/accept-invite/[token]">) {
  return <main className="grid min-h-screen place-items-center bg-paper-2 p-4"><section className="w-full max-w-md rounded-xl border border-line bg-white p-8"><h1 className="mb-2 text-2xl">Join Evergreen CMS</h1><p className="mb-6 text-sm text-muted-foreground">Choose a secure password to activate your account.</p><Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-paper-2" />}><InviteForm params={params} /></Suspense></section></main>;
}

async function InviteForm({ params }: { params: PageProps<"/admin/accept-invite/[token]">["params"] }) {
  const { token } = await params;
  return <AcceptInviteForm token={token} />;
}
