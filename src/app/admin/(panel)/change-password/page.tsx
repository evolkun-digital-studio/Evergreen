import { PageHeader } from "@/components/admin/PageHeader";
import { requirePageUser } from "@/lib/auth/session";
import { Suspense } from "react";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default function ChangePasswordPage() { return <><PageHeader title="Change password" description="Use at least 12 characters." /><Suspense fallback={<div className="h-64 max-w-lg animate-pulse rounded-xl bg-paper-2" />}><ProtectedForm /></Suspense></>; }
async function ProtectedForm() { await requirePageUser(); return <ChangePasswordForm />; }
