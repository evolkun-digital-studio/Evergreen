export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { validateProductionEnvironment } = await import("@/lib/env/production.mjs");
    const localE2E =
      process.env.E2E_BASE_URL === process.env.AUTH_URL &&
      /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(process.env.E2E_BASE_URL ?? "");
    validateProductionEnvironment(process.env, { allowLocalAuthUrl: localE2E });
  }
}
