# Evergreen

Website and CMS for Evergreen, an authorised recycling company in Sitapur, Uttar Pradesh. [IndiaWMS](https://indiawms.in) is the associated group company in Lucknow for EPR credits and compliance.

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and MongoDB. The public site is in
`src/app` and `src/components`; the blog CMS lives under `/admin`.

## Run it locally

Requires Node 24.3.x and npm.

```bash
npm ci
copy .env.example .env   # fill in the values below (Windows)
npm run db:dev           # local MongoDB replica set (or use Atlas)
npm run db:seed          # first admin user and default categories
npm run dev
```

The site runs on http://localhost:3000 and the CMS on http://localhost:3000/admin.

## Environment variables

See `.env.example` for the full list. The ones you need to start:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public origin used for canonicals, sitemaps and structured data |
| `MONGODB_URI`, `MONGODB_DB` | Database connection. Use the `evergreen` database with its own Atlas user |
| `AUTH_SECRET` | Session signing key for the CMS |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | First admin account created by `npm run db:seed` |
| `STORAGE_DRIVER` | `local`, `s3` or `imagekit` for uploaded media |

## Company facts

Names, contacts, address and subsidiaries live in `src/config/site.ts`. Values set to `CONFIRM`
show an amber badge in development and are hidden in production. Figures that still need checking
are in `src/content/stats.ts`.

## Checks

```bash
npm run check        # route types + TypeScript
npm run lint         # ESLint
npm run test         # unit tests
npm run build        # production build
npm run build:production # validated standalone artifact in production-build/
npm run copy:check   # no 6-word overlap with the IndiaWMS site copy
npm run fonts:check  # no unsupported characters in the Franie trial font (needs a running server)
```

## GitHub & CI

This repository is configured for GitHub and includes an automated CI workflow at `.github/workflows/ci.yml`:
- Validates route types and TypeScript (`npm run check`)
- Runs ESLint (`npm run lint`)
- Runs Vitest unit tests (`npm run test`)
- Verifies production Next.js build (`npm run build`)

To push this repository to GitHub:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## Self-hosted production deployment

Run `npm run build:production` on the same OS/architecture as the production server, then upload
`production-build/`. The folder is self-contained; no production `npm install` is required.
See the generated `production-build/DEPLOYMENT.md` for environment, reverse proxy, permissions,
health-check, restart, robots, sitemap, and native dependency guidance.

## Alternative managed deployment

1. Import the repository. The project uses npm and `package-lock.json`.
2. **Environment Variables**: In your Vercel Project Settings → **Environment Variables**, configure:
   - `NEXT_PUBLIC_SITE_URL`: Your production domain (e.g. `https://evergreenrecycler.in`).
   - `MONGODB_URI`: MongoDB Atlas connection string (replica set enabled).
   - `MONGODB_DB`: Database name (e.g. `evergreen`).
   - `AUTH_SECRET`: Secret key for session tokens (`openssl rand -base64 33`).
   - `STORAGE_DRIVER`: Set to `s3` or `imagekit` (Vercel serverless filesystem is ephemeral; do not use `local` in production).
   - `S3_*` or `IMAGEKIT_*`: Credentials for your configured storage provider.
   - `CRON_SECRET`: Optional secret for securing `/api/cron/*` endpoints. Vercel automatically sends this token if configured.
3. **Cron Jobs (`vercel.json`)**:
   - `vercel.json` schedules automated background jobs (publishing scheduled posts, indexing retries, link health checks).
   - *Note on Plans*: Sub-daily cron schedules (e.g. `* * * * *`) require a **Vercel Pro** plan. If deploying to a **Vercel Hobby** account, modify `vercel.json` to schedule tasks once per day (or remove cron definitions) to comply with Hobby plan limitations.

Before launch, buy the Franie web licence and replace the trial files in `src/fonts/franie/`.
