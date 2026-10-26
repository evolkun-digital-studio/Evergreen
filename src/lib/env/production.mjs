const DEPLOYMENT_ENVS = new Set(["production", "staging", "preview", "development"]);
const STORAGE_DRIVERS = new Set(["local", "s3", "imagekit"]);

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function missing(env, names, issues) {
  for (const name of names) if (!env[name]?.trim()) issues.push(`${name} is required`);
}

/** Validates names and relationships only; secret values are never included in an error. */
export function validateProductionEnvironment(env = process.env, options = {}) {
  const issues = [];
  const deployment = env.SITE_ENV?.trim();
  if (!deployment || !DEPLOYMENT_ENVS.has(deployment)) {
    issues.push("SITE_ENV must be production, staging, preview, or development");
  }
  if (options.requireProduction && deployment !== "production") {
    issues.push("SITE_ENV must be production for a production artifact");
  }

  missing(env, ["NEXT_PUBLIC_SITE_URL", "AUTH_URL", "MONGODB_URI", "MONGODB_DB", "AUTH_SECRET", "CRON_SECRET", "STORAGE_DRIVER"], issues);
  if (env.NEXT_PUBLIC_SITE_URL && !isHttpsUrl(env.NEXT_PUBLIC_SITE_URL)) {
    issues.push("NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL");
  }
  const localE2EAuth =
    options.allowLocalAuthUrl === true &&
    /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(env.AUTH_URL ?? "");
  if (env.AUTH_URL && !isHttpsUrl(env.AUTH_URL) && !localE2EAuth) {
    issues.push("AUTH_URL must be an absolute HTTPS URL");
  }
  if (env.NEXT_PUBLIC_SITE_URL && env.AUTH_URL && !localE2EAuth) {
    try {
      if (new URL(env.NEXT_PUBLIC_SITE_URL).origin !== new URL(env.AUTH_URL).origin) {
        issues.push("AUTH_URL must use the same origin as NEXT_PUBLIC_SITE_URL");
      }
    } catch {
      // The individual URL errors above are enough.
    }
  }
  if (env.MONGODB_URI && !/^mongodb(?:\+srv)?:\/\//.test(env.MONGODB_URI)) {
    issues.push("MONGODB_URI must be a MongoDB connection URI");
  }
  if (env.MONGODB_DB && env.MONGODB_DB !== "evergreen") issues.push("MONGODB_DB must be evergreen");
  if (env.AUTH_SECRET && env.AUTH_SECRET.length < 32) issues.push("AUTH_SECRET must be at least 32 characters");
  if (env.CRON_SECRET && env.CRON_SECRET.length < 32) issues.push("CRON_SECRET must be at least 32 characters");

  const storage = env.STORAGE_DRIVER?.toLowerCase();
  if (storage && !STORAGE_DRIVERS.has(storage)) issues.push("STORAGE_DRIVER must be local, s3, or imagekit");
  const documentStorage = (env.DOCUMENTS_STORAGE_DRIVER || storage || "local").toLowerCase();
  if (!new Set(["local", "s3"]).has(documentStorage)) {
    issues.push("DOCUMENTS_STORAGE_DRIVER must be local or s3");
  }
  if (storage === "s3" || documentStorage === "s3") {
    missing(env, ["S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"], issues);
    if (storage === "s3") missing(env, ["S3_BUCKET", "S3_PUBLIC_URL"], issues);
    if (documentStorage === "s3" && !env.DOCUMENTS_S3_BUCKET && !env.S3_BUCKET) {
      issues.push("DOCUMENTS_S3_BUCKET or S3_BUCKET is required for private S3 storage");
    }
    if (env.S3_PUBLIC_URL && !isHttpsUrl(env.S3_PUBLIC_URL)) issues.push("S3_PUBLIC_URL must be an absolute HTTPS URL");
  }
  if (storage === "imagekit") missing(env, ["IMAGEKIT_PRIVATE_KEY", "IMAGEKIT_URL_ENDPOINT"], issues);

  if (env.MEDIA_MAX_UPLOAD_MB) {
    const max = Number(env.MEDIA_MAX_UPLOAD_MB);
    if (!Number.isFinite(max) || max < 1 || max > 100) issues.push("MEDIA_MAX_UPLOAD_MB must be between 1 and 100");
  }
  const email = [env.SMTP_HOST, env.SMTP_PORT, env.SMTP_USER, env.SMTP_PASS, env.ENQUIRY_EMAIL_FROM, env.ENQUIRY_EMAIL_TO];
  if (email.some(Boolean) && !env.SMTP_HOST) issues.push("SMTP_HOST is required when email delivery is configured");
  if (email.some(Boolean) && !env.ENQUIRY_EMAIL_FROM) issues.push("ENQUIRY_EMAIL_FROM is required when email delivery is configured");
  if (env.SMTP_PORT && !(Number.isInteger(Number(env.SMTP_PORT)) && Number(env.SMTP_PORT) > 0 && Number(env.SMTP_PORT) < 65536)) {
    issues.push("SMTP_PORT must be a port number such as 587 or 465");
  }
  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASS)) issues.push("SMTP_USER and SMTP_PASS must be set together");

  if (issues.length) {
    throw new Error(`[environment] Invalid production configuration:\n- ${issues.join("\n- ")}`);
  }
}
