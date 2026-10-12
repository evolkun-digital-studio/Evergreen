import "server-only";
import { z } from "zod";
import { PermissionError, UserFacingError } from "@/lib/errors";

export { UserFacingError };

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Wraps a Server Action body: validation, permission and user-facing errors become a typed
 * result; anything else is logged and reported generically so internals never leak.
 */
export async function runAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), message };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
    }
    if (error instanceof PermissionError) return { ok: false, error: error.message };
    if (error instanceof UserFacingError) return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    if ((error as { code?: number }).code === 11000) {
      return { ok: false, error: "Something with that slug or key already exists." };
    }
    console.error("[action]", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

// redirect()/notFound() work by throwing; they must propagate.
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR"));
}
