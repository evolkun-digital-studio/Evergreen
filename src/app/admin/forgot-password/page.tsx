import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-paper-2 p-4"><section className="w-full max-w-md rounded-xl border border-line bg-white p-8"><h1 className="text-2xl">Reset your password</h1><p className="mb-6 mt-2 text-sm text-muted-foreground">We’ll email a single-use link that expires in 30 minutes.</p><ForgotPasswordForm /></section></main>;
}
