import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const root = path.resolve(process.cwd());
const source = path.join(root, ".next", "standalone");
const output = path.join(root, "production-build");

if (path.dirname(output) !== root || path.basename(output) !== "production-build") {
  throw new Error("Refusing to remove an unexpected deployment path.");
}
if (!(await stat(source).catch(() => null))?.isDirectory()) {
  throw new Error(".next/standalone is missing. Run next build with output: standalone first.");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const excludedNames = new Set([".git", ".turbo", ".cache", "coverage", "test-results", "playwright-report"]);
const includeTracedFile = (sourcePath) => {
  const name = path.basename(sourcePath);
  const relative = path.relative(source, sourcePath);
  if (relative === "storage" || relative.startsWith(`storage${path.sep}`)) return false;
  if (name === ".env" || name.startsWith(".env.")) return false;
  if (excludedNames.has(name)) return false;
  return true;
};
await cp(source, output, {
  recursive: true,
  dereference: true,
  force: true,
  filter: includeTracedFile,
});
await mkdir(path.join(output, ".next"), { recursive: true });
await cp(path.join(root, ".next", "static"), path.join(output, ".next", "static"), {
  recursive: true,
  dereference: true,
  force: true,
});
const publicDir = path.join(root, "public");
if ((await stat(publicDir).catch(() => null))?.isDirectory()) {
  await cp(publicDir, path.join(output, "public"), {
    recursive: true,
    dereference: true,
    force: true,
    filter: (sourcePath) => {
      const relative = path.relative(publicDir, sourcePath);
      return relative !== "uploads" && !relative.startsWith(`uploads${path.sep}`);
    },
  });
}
await mkdir(path.join(output, "storage", "uploads"), { recursive: true });
await mkdir(path.join(output, "storage", "private"), { recursive: true });

const deployment = `# Evergreen standalone deployment

This artifact was built for **${process.platform}/${process.arch}** with Node.js **24.3.0**. Native dependencies (notably Sharp) are platform-specific. Build on Linux/WSL/Linux CI for a Linux server; do not upload a Windows-built artifact to Linux.

## Deploy

1. Upload the entire \`production-build/\` folder and use it as the application root.
2. Do not run \`npm install\`; traced production dependencies are already included.
3. Configure the runtime environment listed below in the service manager. Do not upload an \`.env\` file with the artifact.
4. Grant the service user read access to the artifact. If local storage is selected, mount persistent storage and grant write access to \`storage/uploads\` and \`storage/private\`. Existing upload data is intentionally not bundled; preserve or migrate it separately between releases.
5. Start with \`node server.js\`. Set \`PORT\` (for example \`3000\`) and \`HOSTNAME\` (normally \`127.0.0.1\` behind a reverse proxy, or \`0.0.0.0\` in a container).

## Runtime environment

Required: \`SITE_ENV=production\`, \`NEXT_PUBLIC_SITE_URL\` (also fixed into public SEO/browser output at build time), \`AUTH_URL\`, \`AUTH_SECRET\`, \`MONGODB_URI\`, \`MONGODB_DB=evergreen\`, \`CRON_SECRET\`, and \`STORAGE_DRIVER\`.

Storage-dependent: \`S3_REGION\`, \`S3_BUCKET\`, \`S3_ACCESS_KEY_ID\`, \`S3_SECRET_ACCESS_KEY\`, \`S3_PUBLIC_URL\`, optional \`S3_ENDPOINT\`, optional \`DOCUMENTS_STORAGE_DRIVER\`, optional \`DOCUMENTS_S3_BUCKET\`; or \`IMAGEKIT_PRIVATE_KEY\`, \`IMAGEKIT_URL_ENDPOINT\`, and optional \`IMAGEKIT_FOLDER\`.

Optional runtime: \`MONGODB_DNS_SERVERS\`, \`MEDIA_MAX_UPLOAD_MB\`, \`SMTP_HOST\`, \`SMTP_PORT\`, \`SMTP_SECURE\`, \`SMTP_USER\`, \`SMTP_PASS\`, \`ENQUIRY_EMAIL_FROM\`, \`ENQUIRY_EMAIL_TO\`, \`INDEXNOW_KEY\`, \`GOOGLE_SERVICE_ACCOUNT_JSON\`, \`PREVIEW_SECRET\`, \`PORT\`, and \`HOSTNAME\`.

Optional build-time: \`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY\` (required for multiple instances), \`DEPLOYMENT_VERSION\` (rolling-deployment version skew protection), and \`NEXT_PUBLIC_BUILD_YEAR\`.

Seed/test only: \`SEED_ADMIN_EMAIL\`, \`SEED_ADMIN_PASSWORD\`, \`SEED_ADMIN_NAME\`, \`DEV_DB_PORT\`, \`INDIAWMS_SRC\`, and \`E2E_*\` variables.

## Server requirements

- Put nginx, Caddy, Apache, or a managed load balancer in front of Node. Terminate HTTPS there, reject unexpected Host headers, overwrite (do not append untrusted) \`X-Forwarded-For\`, and forward \`Host\`, \`X-Forwarded-Host\`, and \`X-Forwarded-Proto=https\`.
- Do not buffer streamed responses. Apply request/body limits and edge rate limiting. HSTS is emitted by the app, so HTTPS must remain enabled.
- Persist \`.next/cache\` and local upload directories when used. Multiple instances need shared cache/tag coordination and one \`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY\`.
- Restart with a process manager such as systemd or PM2 using graceful \`SIGTERM\`, with a 10–30 second drain window.

Health check: \`GET /api/health\` (expect HTTP 200 and \`{"status":"ok"}\`). SEO checks: \`GET /robots.txt\` and \`GET /sitemap.xml\`.
`;
await writeFile(path.join(output, "DEPLOYMENT.md"), deployment, "utf8");

const secretNames = [
  "AUTH_SECRET", "MONGODB_URI", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "IMAGEKIT_PRIVATE_KEY",
  "SMTP_PASS", "CRON_SECRET", "PREVIEW_SECRET", "GOOGLE_SERVICE_ACCOUNT_JSON",
  "SEED_ADMIN_PASSWORD", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
];
const secretValues = secretNames.map((name) => process.env[name]).filter((value) => value && value.length >= 8);

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(full);
      continue;
    }
    if (entry.name === ".env" || entry.name.startsWith(".env.")) {
      throw new Error(`Forbidden environment file in deployment: ${path.relative(output, full)}`);
    }
    const info = await stat(full);
    if (!secretValues.length || info.size > 10 * 1024 * 1024) continue;
    const body = await readFile(full);
    if (secretValues.some((value) => body.includes(Buffer.from(value)))) {
      throw new Error(`A configured secret was found in ${path.relative(output, full)}`);
    }
  }
}

await inspect(output);
console.log(`Standalone artifact prepared at ${output}`);
