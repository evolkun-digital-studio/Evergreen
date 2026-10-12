"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string };

function safeCallbackUrl(value: FormDataEntryValue | null): string {
  const url = typeof value === "string" ? value : "";
  // Only same-origin admin paths; rejects "//evil.com" and absolute URLs.
  return url.startsWith("/admin") && !url.startsWith("//") && !url.startsWith("/admin/login") ? url : "/admin";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
    }
    if (error instanceof AuthError) return { error: "Incorrect email or password." };
    throw error; // successful sign-in redirects by throwing
  }
  return {};
}
