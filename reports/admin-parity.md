# Evergreen admin/CMS parity audit

Audit date: 2026-10-14

## Scope and baseline limitation

The requested IndiaWMS source reference is not available at either expected location:

- `../indiawms-premium`
- `reference/indiawms-admin`

A broader search under `C:\Users\Navneet` also found no IndiaWMS project directory. Therefore, exact code-for-code or behavior-for-behavior parity with IndiaWMS cannot yet be proven. The statuses below compare the current Evergreen implementation against the feature contract in the supplied brief. Once the reference is supplied, every ✅ row still needs a final reference comparison.

Legend: ✅ present and consistent with the brief; ⚠️ present but different/incomplete; ❌ missing.

No application code or database data was changed during this audit. Atlas was not contacted, and no seed, index, or rescore command was run.

## Auth and authorization

| Feature | Status | Evidence in Evergreen | Gap / parity work |
|---|---:|---|---|
| Login | ✅ | `src/app/admin/login/*`, Auth.js credentials flow | Recompare validation, messages, and redirect behavior when the IndiaWMS source is available. |
| Logout | ✅ | Server-side `signOutAction` in `src/app/admin/(panel)/layout.tsx` | Recompare reference behavior. |
| Forgot password | ❌ | No forgot-password route, action, model fields, or UI exists. | Port the reference token lifecycle, rate limits, email delivery, expiry, and invalidation behavior. |
| Reset password | ❌ | Only admin-entered password replacement exists in Users; no user-facing reset flow. | Add reset-token persistence, reset page/action, password policy, and session invalidation to match the reference. |
| Roles: ADMIN / EDITOR / AUTHOR | ✅ | `ROLES` and permission matrix in `src/lib/cms/constants.ts` | Verify every permission boundary against IndiaWMS. |
| Login rate limiting | ✅ | Mongo-backed limiter in `src/lib/rate-limit.ts`; login action returns a rate-limited error. | Recompare limits/window/keying with the reference. |
| Session handling | ✅ | JWT session, seven-day max age, hourly update; DB re-read rejects disabled/demoted users in `src/lib/auth/session.ts`. | Recompare durations and invalidation semantics. |
| Protected admin routes | ✅ | `src/proxy.ts` performs optimistic JWT gating and adds noindex headers. | Recompare matchers and public exceptions. |
| Server-side role checks | ✅ | `requirePageUser(permission)` and `requireActionUser(permission)` are used across protected pages/actions. | Keep these checks authoritative even when nav items are hidden. |

## Dashboard

| Feature | Status | Evidence in Evergreen | Gap / parity work |
|---|---:|---|---|
| Stat cards | ✅ | Total, draft, published, scheduled, category, and tag cards in `src/app/admin/(panel)/page.tsx`. | Recompare definitions and card destinations. |
| Recent posts | ✅ | Six most recently updated posts with status and scores. | Recompare count/order. |
| Scheduled posts | ✅ | Upcoming scheduled list ordered by `scheduledFor`. | Recompare count/order and timezone display. |
| Low-score posts | ✅ | SEO score below 60, with SEO/AEO/GEO display. | Recompare threshold and score definitions. |
| Broken-link count | ✅ | Count, affected-post count, and last scan time. | Recompare aggregation rules. |
| Stale posts | ✅ | Published posts not updated in 365 days. | Recompare stale threshold and date precedence. |

## Posts and editor

| Feature | Status | Evidence in Evergreen | Gap / parity work |
|---|---:|---|---|
| Posts table | ✅ | Paginated table with status/category/author and SEO/AEO/GEO scores. | Recompare columns and row actions. |
| Search and filters | ✅ | Search plus category, author, tag, status, and sort controls in `PostsTable.tsx`. | Recompare query semantics. |
| Bulk actions | ⚠️ | Publish, draft, trash, restore, and permanent delete exist. Confirmations use `window.confirm`. | Match IndiaWMS action set and replace browser confirms with the required confirmation dialogs. |
| Trash | ✅ | Dedicated trash view, restore, and permanent deletion; restored items remain drafts. | Recompare retention and permissions. |
| Custom blocks | ✅ | Callouts, expert quote, code, key takeaways, FAQ, and TOC are registered in `src/components/editor/blocks.ts`. | Recompare node schemas and serialized output. |
| No italic control | ✅ | Toolbar includes bold, underline, strike, and code; no italic button. A legacy parser extension preserves imported italic content. | Recompare imported-content behavior. |
| Publish panel | ✅ | Publish metadata, author/category/tags/media, schedule state, and related controls. | Recompare all fields and validation. |
| SEO panel | ✅ | Focus keyword, metadata, canonical, robots, OG, X/Twitter, and breadcrumb controls. | Recompare field defaults and validation. |
| AI SEO panel | ✅ | Summary, takeaways, FAQ, entity, audience, locale, content type, and intent fields. | Recompare field limits and scoring inputs. |
| Schema panel | ✅ | HowTo, Video, Review, Product, speakable, entity data, and JSON-LD preview/validation. | Recompare schema rules and eligibility conditions. |
| Score and checklist panel | ✅ | Live debounced SEO/AEO/GEO/readability scoring with fix targets. | Exact scoring weights/rules remain unverified without IndiaWMS. |
| SERP and social previews | ✅ | Google, Facebook/LinkedIn, and X/Twitter previews in `SeoPanel.tsx` / `Previews.tsx`. | Recompare dimensions and fallback rules. |
| Autosave | ✅ | Periodic autosave in `PostEditor.tsx`; live/scheduled posts use autosave revisions. | Recompare interval and conflict behavior. |
| Revisions | ✅ | Revision list, snapshots, restore flow, and a 50-revision limit. | Recompare pruning and revision reasons. |
| Scheduling | ✅ | Scheduled state, timestamp UI, scheduler service, and cron route. | Recompare timezone and due-post transaction behavior. |
| Preview links | ✅ | Signed preview paths and `/blog/preview/[id]` route. | Recompare expiry/signature behavior. |
| Public article output | ✅ | Public post route emits JSON-LD; renderer supports featured content, inline TOC, and FAQ markup. | Must still be browser-tested during implementation phase. |

## Library, taxonomy, people, and leads

| Feature | Status | Evidence in Evergreen | Gap / parity work |
|---|---:|---|---|
| Media library | ✅ | Upload, grid/list views, search/filtering, metadata editing, variants, usage lookup, and guarded deletion. | Recompare upload limits, processing, and supported drivers. |
| Nested categories | ✅ | `parentId` and ordered parent hierarchy exist in the category model and manager. | Recompare cycle/depth validation. |
| Tags and merge | ✅ | Multi-select merge moves post references, deletes sources, and creates redirects. | Recompare transaction/error semantics. |
| Authors | ✅ | Author list, create/edit/delete, profile/SEO fields, and slug redirects. | Recompare exact fields and delete constraints. |
| User roles and disable | ✅ | Role editing, active switch, self-disable prevention, and last-active-admin protection. | Recompare rules with the reference. |
| User invitation | ⚠️ | Admin creates an account immediately with a manually entered temporary password. There is no emailed invite/token/acceptance flow. | Port the IndiaWMS invitation behavior instead of treating direct account creation as an invite. |
| Enquiries admin module | ❌ | Public pickup submissions persist to the `enquiries` collection, but there is no `/admin/enquiries` route or nav item. | Add the retained Evergreen Leads/Enquiries workflow, including list/detail/status actions and permissions. |
| EPR calculator/data | ✅ | Public EPR calculator and Evergreen EPR datasets are present. | Preserve during parity work; it is Evergreen-specific. |
| EPR calculator leads | ❌ | The calculator does not persist a dedicated lead visible in admin. | Add only if this exists in the intended Evergreen behavior; the brief names it as an example of retained functionality. |

## SEO tools, settings, jobs, and scripts

| Feature | Status | Evidence in Evergreen | Gap / parity work |
|---|---:|---|---|
| Broken links | ✅ | Admin scan UI, persisted results, manual scan action, and daily cron route. | Recompare retry/classification rules. |
| Redirects | ✅ | 301/302 CRUD, loop prevention, managed runtime resolution, and automatic slug redirects. | Recompare reserved paths and chain handling. |
| robots.txt editor | ✅ | Admin-only editor persists `SiteSettings.robotsTxt`; public route consumes it. | Recompare validation and defaults. |
| Indexing log / IndexNow | ✅ | Log UI, manual retry, automatic queueing, key route, and retry cron. | Recompare retention and backoff. |
| Site settings | ✅ | General site identity, pagination, logo/favicon, and default social image fields. | Recompare exact fields/defaults. |
| Organisation settings | ✅ | Full Organization identity/contact/address/description/sameAs form. | Recompare schema mapping. |
| Analytics IDs | ✅ | GTM, GA4, Clarity, Meta Pixel, and consent setting. | Recompare script-loading behavior. |
| Verification codes/defaults | ✅ | GSC/Bing verification, robots defaults, indexing toggles, and score threshold. | Recompare all default values. |
| `publish-scheduled` cron | ✅ | Authenticated route at `src/app/api/cron/publish-scheduled/route.ts`. | End-to-end execution remains untested. |
| `link-check` cron | ✅ | Authenticated route with five-minute max duration. | End-to-end execution remains untested. |
| `indexing-retry` cron | ✅ | Authenticated retry route. | End-to-end execution remains untested. |
| `db:seed` | ⚠️ | Script exists and creates settings, an admin, author profile, and categories. Existing admin passwords are **not reset**; required category names differ; logs include email/category names rather than only created/updated. | Make seed idempotently reset the configured admin password and role, use the requested seven Evergreen categories, and reduce output to non-sensitive created/updated summaries. |
| `db:indexes` | ✅ | Script creates collections, synchronizes declared indexes, and reports results. | Run against Atlas only after environment/user scope is confirmed. |
| `db:rescore` | ✅ | Script recomputes all post scores. | Exact score parity remains unverified without IndiaWMS. |

## Evergreen admin UI contract

| UI requirement | Status | Evidence in Evergreen | Gap / parity work |
|---|---:|---|---|
| Dark Evergreen sidebar | ⚠️ | Sidebar tokens and dark treatment exist, with a collapsible desktop icon rail and mobile off-canvas behavior. | Verify exact `evergreen-950`/WCAG AA colors and add the required moss left-bar active indicator. |
| Evergreen logo and nav grouping | ⚠️ | Sidebar says “Evergreen CMS”, but the logo tile visibly contains `IW`; groups are Content / SEO Tools / Admin. | Replace `IW` with the white Evergreen mark and reorganize as Content · Library · People · Leads · SEO · Site. |
| Role-filtered navigation | ✅ | Items are filtered through the permission matrix. | Add role-filtered Leads items when the module exists. |
| Top bar | ❌ | Current bar only has the sidebar trigger and “Signed in as” text. | Add page title + breadcrumb, Cmd/Ctrl+K palette, View site, and user menu. |
| Content surfaces | ⚠️ | White cards/panels and line borders are common, but radii/shadows are inconsistent and the requested `#F5F7F6` panel treatment is not systematically enforced. | Normalize tokens and remove heavy shadows, including the settings save button. |
| Typography | ⚠️ | Page titles use `font-display`, but `admin.css` aliases display text to Manrope rather than Franie. | Restore Franie for titles/logo and Manrope elsewhere; keep italic editing unavailable. |
| Buttons and create action | ⚠️ | Evergreen/destructive variants exist, but the post CTA is “Add new”, not moss “New post”. | Align labels, hierarchy, and accent treatment to the contract. |
| Login split layout | ❌ | Current login is a centered card on a solid dark background. | Build the photo/card split layout with a white logo over the Evergreen yard image. |
| Toasts and confirmations | ⚠️ | Most actions use Sonner, but several destructive flows use `window.confirm`. | Use accessible dialogs for every confirmation and retain Sonner result feedback. |
| Skeletons | ✅ | Admin data loaders use Suspense fallbacks matching cards/lists/tables. | Recompare reference dimensions after the UI port. |
| Empty states | ⚠️ | Empty messages exist, but several lack the required single next action. | Add one contextual CTA to each empty state. |

## MongoDB and environment setup

| Requirement | Status | Evidence in Evergreen | Gap / parity work |
|---|---:|---|---|
| Dedicated `evergreen` database | ⚠️ | `connectDB()` passes `dbName: process.env.MONGODB_DB || "evergreen"`, so the runtime defaults safely; the current `.env` does **not** declare `MONGODB_DB`. | Add `MONGODB_DB=evergreen` to `.env` before any Atlas command and assert the expected DB name in scripts. |
| Read credentials from environment | ⚠️ | App code reads environment variables, but standalone scripts explicitly load `.env.local` before `.env`. | If “`.env` only” is strict, change the script loader and document Next’s normal precedence; otherwise clarify the intended precedence. |
| Cached Mongoose helper | ✅ | `src/lib/db-core.ts` caches the connection/promise on `globalThis` and sets serverless-friendly pool/timeouts. | Keep this behavior. |
| Clear Atlas connection errors | ❌ | Connection failures are rethrown unchanged. No bad-auth, IP allow-list/DNS/timeout, or wrong-database mapping exists. | Add sanitized, actionable error classification without logging URI/password. |
| Existing-admin password reset in seed | ❌ | `scripts/seed.ts` only hashes the password when creating a new user. | Always update the configured seed admin’s password hash from `.env`; never print it. |
| Required default categories | ⚠️ | Current six categories differ from the requested seven and naming is inconsistent (`Plastic Waste`, `Group News`, etc.). | Seed exactly: E-Waste, Battery Recycling, Plastic Recycling, Metal Recovery, EPR & Compliance, Sustainability, Company News. |
| Evergreen identity defaults | ⚠️ | Legal organisation data comes from `site.ts`, but `siteTitle` is “Evergreen” and title template is `%s | Evergreen`, not the requested name and `%s | Ever Green`. | Align defaults with the brief while preserving `site.ts` as the source of truth. |
| Fresh `AUTH_SECRET` | ✅ | Current `.env` contains a non-empty `AUTH_SECRET` (value was not displayed). | Add safe generation behavior only if the implementation must self-heal when absent. |
| `.env.example` completeness | ⚠️ | Core CMS variables are documented, but used variables such as `RESEND_API_KEY`, `ENQUIRY_EMAIL_TO`, `ENQUIRY_EMAIL_FROM`, and `NEXT_PUBLIC_BUILD_YEAR` are absent. | Document every supported runtime/script variable without real values. |
| `.env` git safety | ✅ | `.gitignore` explicitly excludes `.env` and `.env*.local`. | Preserve this rule. |

### Atlas access recommendation

Create a separate Atlas database user for this application with `readWrite` on the `evergreen` database only. Do not reuse a cluster-wide admin user and do not grant access to the IndiaWMS database. Before running `pnpm db:indexes` or `pnpm db:seed`, verify `MONGODB_DB=evergreen` and the Atlas user’s scoped role in the Atlas UI.

## Verification status

The requested end-to-end workflow and final commands (`pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, Playwright journeys, cron execution, and screenshots) belong after parity implementation. They were intentionally not run in this audit-only phase. Current source inspection establishes feature presence, not runtime correctness.

## Next gate

Provide the IndiaWMS reference at `../indiawms-premium` or `reference/indiawms-admin/`. The next pass should first replace the baseline-limited statuses above with an exact source comparison, then implement every ❌ and ⚠️ item. No database-mutating command should run until the `.env` database name and the Atlas user’s `evergreen`-only permissions are confirmed.
