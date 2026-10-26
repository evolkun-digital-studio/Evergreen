import "server-only";

/** Logs full errors only in development; production logs never include messages or stacks. */
export function logServerError(scope: string, error: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(scope, error);
    return;
  }
  const value = error && typeof error === "object" ? (error as { name?: unknown; code?: unknown }) : null;
  console.error(scope, {
    name: typeof value?.name === "string" ? value.name : "Error",
    code: typeof value?.code === "string" || typeof value?.code === "number" ? value.code : undefined,
  });
}
