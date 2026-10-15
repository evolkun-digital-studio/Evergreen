"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth";
import { isDatabaseConnectionError } from "@/lib/db";

export type DocumentsLoginState = { error?: string };

/** Same-origin /documents paths only; rejects "//evil.com", absolute URLs and the login page. */
function safeNext(value: FormDataEntryValue | null): string {
  const url = typeof value === "string" ? value : "";
  return /^\/documents(\/|\?|$)/.test(url) && !url.startsWith("/documents/login") ? url : "/documents";
}

// Same Auth.js credentials provider (and per-IP / per-email rate limits) as the admin login.
export async function documentsLoginAction(_prev: DocumentsLoginState, formData: FormData): Promise<DocumentsLoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeNext(formData.get("next")),
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) return { error: "Service unavailable. Please try again shortly." };
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
    }
    if (error instanceof AuthError) {
      if (isDatabaseConnectionError(error.cause?.err)) return { error: "Service unavailable. Please try again shortly." };
      return { error: "Incorrect email or password." };
    }
    throw error; // successful sign-in redirects by throwing
  }
  return {};
}
