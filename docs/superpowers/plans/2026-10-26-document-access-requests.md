# Document Access Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace login-gated `/documents` with a request, admin review, emailed-link, revocable-grant flow.

**Architecture:** A new `DocumentAccessRequest` Mongo model carries status and the grant (scope, document ids, token hash, expiry). Pure functions in `src/lib/documents/grant.ts` decide whether a grant is valid and what it covers. A route handler turns the emailed token into an HTTP-only cookie, and the private file route re-validates that cookie on every request. Staff sessions keep working at `/documents/library`.

**Tech Stack:** Next.js 16 App Router (breaking changes: read `node_modules/next/dist/docs/` before routes, actions, `proxy.ts`), Mongoose 9, zod 4, Auth.js v5, Resend via `src/lib/email.ts`, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-26-document-access-requests-design.md`

## Global Constraints

- Link valid **7 days** by default; admin choices **1, 7, 30, 90** days.
- Only the **SHA-256 hash** of the access token is stored (`hashToken` from `src/lib/auth/tokens.ts`); the raw token exists only in the email.
- Success message after submitting, verbatim: `Thanks. Admin will respond to you very soon by email.`
- Invalid / revoked / expired / rejected links all show the same neutral text: `This link is no longer valid. You can request access again.`
- File responses stay `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`.
- Public selector exposes **title and category only** (no description, file name, size).
- Rate limits: 5 requests per IP per hour, 3 per email per day (`hitRateLimit`).
- Staff sign-in stays at `/documents/login`; the signed-in library moves to `/documents/library`.
- Admin pages and actions gated by `can.manageDocuments`.
- Match surrounding code style: `runAction`/`UserFacingError` for admin actions, `logServerError` for swallowed errors, Tailwind classes as in `DocumentsLibrary.tsx`.
- Run `npm test` and `npm run check` before every commit; never skip hooks.

## Review Focus

- Email in mixed case / with spaces: stored lowercased and trimmed, rate-limited on the normalised value.
- Request for document ids that are inactive, deleted or malformed: dropped silently, request still accepted (whole-library only if none requested).
- Grant of `scope: "selected"` whose document is later deleted or deactivated: that document is not served, the rest still are.
- Grant cookie that is tampered with, belongs to a different request, or names a non-ObjectId: treated as no grant (401), never a 500.
- Token resend: the previous token stops working at once.

---

### Task 1: Pure grant rules

**Files:**
- Create: `src/lib/documents/grant.ts`
- Test: `tests/unit/document-grant.test.ts`

**Interfaces:**
- Produces:
  - `GRANT_COOKIE = "doc_grant"`, `EXPIRY_DAYS = [1, 7, 30, 90] as const`, `DEFAULT_EXPIRY_DAYS = 7`
  - `type GrantScope = "all" | "selected"`
  - `type RequestState = { status: "pending" | "approved" | "rejected" | "revoked"; grant?: { scope: GrantScope; documentIds: string[]; expiresAt: Date } | null }`
  - `evaluateGrant(state: RequestState, now?: Date): "valid" | "expired" | "revoked" | "rejected" | "pending"`
  - `grantCoversDocument(grant: { scope: GrantScope; documentIds: string[] }, documentId: string): boolean`
  - `encodeGrantCookie(requestId: string, rawToken: string): string` / `parseGrantCookie(value: string | undefined): { requestId: string; rawToken: string } | null`
  - `grantCookieMaxAge(expiresAt: Date, now?: Date): number` (seconds, never negative)

- [ ] **Step 1: Write failing tests** in `tests/unit/document-grant.test.ts`: `evaluateGrant` returns `valid` for approved with future expiry, `expired` at exactly `expiresAt`, `revoked`, `rejected`, `pending`, and `pending` for approved-without-grant; `grantCoversDocument` is true for any id when `scope: "all"`, true only for listed ids when `selected`; `parseGrantCookie("abc")`, `parseGrantCookie("")`, `parseGrantCookie(undefined)` and a value whose requestId is not 24 hex chars return `null`, and `parseGrantCookie(encodeGrantCookie(id, tok))` round-trips; `grantCookieMaxAge` is 0 for a past date.
- [ ] **Step 2:** Run `npx vitest run tests/unit/document-grant.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the functions above. Cookie format is `${requestId}.${rawToken}`; split on the first `.` only (base64url tokens contain no dots).
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** `git add tests/unit/document-grant.test.ts src/lib/documents/grant.ts && git commit -m "feat(documents): pure grant rules"`

---

### Task 2: Model

**Files:**
- Modify: `src/lib/models/document.ts`, `src/lib/models/index.ts`

**Interfaces:**
- Consumes: `GrantScope` from Task 1 (use the literal union in the schema enum).
- Produces: `DocumentAccessRequest` model and `DocumentAccessRequestDoc` type exported from `@/lib/models`, with fields: `name, email (lowercase, trim), company, purpose, requested: { scope, documentIds: ObjectId[] }, status (default "pending"), grant: { scope, documentIds, tokenHash, expiresAt, approvedBy, approvedAt, lastEmailedAt } | null, decisionNote, decidedBy: ObjectId|null, decidedAt: Date|null, ip, userAgent`, timestamps; indexes `{ status: 1, createdAt: -1 }` and `{ email: 1, createdAt: -1 }`. `DocumentAccess` gains optional `requestId` and `userId` becomes `required: false, default: null`.

- [ ] **Step 1:** Add the schema and make `DocumentAccess.userId` optional with `requestId: { type: ObjectId, ref: "DocumentAccessRequest", default: null }`.
- [ ] **Step 2:** Export from `src/lib/models/index.ts`.
- [ ] **Step 3:** Run `npm run check`. Expected: no type errors.
- [ ] **Step 4:** Commit `feat(documents): access request model`.

---

### Task 3: Request validation and emails

**Files:**
- Create: `src/lib/validation/document-request.ts`, `src/lib/documents/request-emails.ts`
- Test: `tests/unit/document-request.test.ts`

**Interfaces:**
- Consumes: `sendTransactionalEmail` from `src/lib/email.ts`; `SITE_URL` from `@/lib/cms/constants`.
- Produces:
  - `documentRequestSchema` (zod): `name` 2-100, `email` valid, trimmed, **lowercased**; `company` ≤ 120 default ""; `purpose` 10-1000; `documentIds: string[]` max 50 default []; `website` string default "" (honeypot). `type DocumentRequestInput = z.input<typeof documentRequestSchema>`.
  - `approvalEmail(p: { name: string; link: string; expiresAt: Date; scopeLabel: string }): { subject: string; text: string }`; likewise `receiptEmail({ name })`, `rejectionEmail({ name, note })`, `revocationEmail({ name })`, `adminAlertEmail({ name, email, company, purpose, scopeLabel })`.
  - `sendToRequester(to: string, message: { subject: string; text: string }): Promise<"sent" | "unconfigured">`; `notifyAdmins(message): Promise<void>` (splits `ENQUIRY_EMAIL_TO` on commas, one send per address, errors via `logServerError`).
  - `approvalLink(requestId: string, rawToken: string): string` = `${SITE_URL}/documents/access/${requestId}.${rawToken}`.

- [ ] **Step 1: Write failing tests:** the schema lowercases and trims `"  A@B.COM "`, rejects purpose `"short"`, accepts an empty `documentIds`; `approvalEmail` text contains the link, the scope label and a formatted expiry date; `rejectionEmail` includes the note when given and omits an empty note line; `approvalLink("65f000000000000000000000", "abc")` equals `https://evergreen.example/documents/access/65f000000000000000000000.abc`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/document-request.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Email copy: short, plain text, same tone as the contact notification; approval email states the link works for the stated period and can be revoked.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat(documents): request validation and email copy`.

---

### Task 4: Data layer

**Files:**
- Create: `src/lib/data/document-requests.ts`

**Interfaces:**
- Consumes: Tasks 1-2; `hashToken` from `@/lib/auth/tokens`; `DocumentItem` from `@/lib/data/documents`.
- Produces:
  - `type PublicDocumentOption = { id: string; title: string; category: DocumentCategory }`; `listPublicDocumentOptions(): Promise<PublicDocumentOption[]>` (active documents only, sorted category then title)
  - `type ActiveGrant = { requestId: string; email: string; scope: GrantScope; documentIds: string[] }`
  - `resolveGrant(cookieValue: string | undefined): Promise<ActiveGrant | null>`: parse cookie, `findById` (invalid ObjectId returns null), compare `hashToken(rawToken)` to `grant.tokenHash` with `crypto.timingSafeEqual`, return null unless `evaluateGrant(...) === "valid"`.
  - `listGrantedDocuments(grant: ActiveGrant): Promise<DocumentItem[]>` (active docs; `all` = every active, `selected` = those ids; ignores `visibleToRoles`)
  - `findGrantedDocument(grant: ActiveGrant, id: string)` (null if not covered, inactive, missing, or invalid id)
  - `type RequestItem` (all fields as strings/ISO dates, plus `requestedDocuments: { id: string; title: string }[]`, `grantedDocuments`, `state: ReturnType<typeof evaluateGrant>`) and `listRequests(): Promise<RequestItem[]>` (latest 200), `countPendingRequests(): Promise<number>`.
  - `type GrantLookup` for the access route: `lookupByToken(requestId: string, rawToken: string): Promise<ActiveGrant & { expiresAt: Date } | null>` (same checks as `resolveGrant` but returns `expiresAt` for the cookie max-age).

- [ ] **Step 1:** Implement the functions; `resolveGrant` is `lookupByToken` over `parseGrantCookie`.
- [ ] **Step 2:** Run `npm run check`. Expected: pass.
- [ ] **Step 3:** Commit `feat(documents): access request data layer`.

---

### Task 5: Public request form, routes and proxy

**Files:**
- Create: `src/app/(site)/documents/actions.ts` (`submitDocumentRequest`), `src/app/(site)/documents/RequestAccessForm.tsx`, `src/app/(site)/documents/library/page.tsx`, `src/app/(site)/documents/library/DocumentsLibrary.tsx` (moved from `../DocumentsLibrary.tsx`)
- Modify: `src/app/(site)/documents/page.tsx`, `src/proxy.ts`, `src/lib/auth/session.ts` (`requireDocumentsUser` default `next`, `requirePageUser` VIEWER redirect), `src/app/(site)/documents/login/actions.ts` (`safeNext` fallback), the `signOutAction` redirect, and the VIEWER redirect in `src/proxy.ts`; all `/documents` post-login targets become `/documents/library`.
- Test: `tests/unit/proxy-documents.test.ts`

**Interfaces:**
- Consumes: `documentRequestSchema`, email helpers (Task 3), `listPublicDocumentOptions` (Task 4), `hitRateLimit`.
- Produces: `submitDocumentRequest(input: DocumentRequestInput): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }>`. Honeypot returns `{ ok: true }` without saving. Rate-limit keys `docreq:ip:<ip>` (5 / 3600 s) and `docreq:email:<email>` (3 / 86400 s). Document ids are filtered to existing active documents; `requested.scope` is `"all"` when none remain, else `"selected"`. After saving, send receipt to requester and `adminAlertEmail` to admins, swallowing errors via `logServerError`. The response never says whether the email was seen before. Pattern: `src/app/(site)/contact/actions.ts`.

- [ ] **Step 1: Write failing proxy tests** in `tests/unit/proxy-documents.test.ts` using the mocking approach of `tests/unit/proxy-matcher.test.ts`: with no `auth` on the request, `/documents` and `/documents/access/tok` return a non-redirect response; `/documents/library` redirects (307) to `/documents/login?next=%2Fdocuments%2Flibrary`; all three carry `X-Robots-Tag: noindex, nofollow`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/proxy-documents.test.ts`. Expected: FAIL (`/documents` currently redirects).
- [ ] **Step 3:** Update `src/proxy.ts`: only `/documents/library` (and sub-paths) requires `request.auth`; `/documents`, `/documents/login`, `/documents/access/*`, `/documents/shared` pass through with the noindex and no-store headers.
- [ ] **Step 4:** `git mv` the library page and component into `documents/library/`, fixing imports; update the redirect targets listed under Files.
- [ ] **Step 5:** Implement `submitDocumentRequest` and `RequestAccessForm` (client component: fields, grouped checkbox selector from `listPublicDocumentOptions`, honeypot field hidden from users, success panel with the verbatim message, field errors). Rewrite `documents/page.tsx` as the public page (keep `robots: noindex` metadata and the `?link=invalid` notice with the neutral invalid-link text) and add a "Staff sign in" link to `/documents/login`.
- [ ] **Step 6:** Run `npm test && npm run check`. Expected: PASS.
- [ ] **Step 7:** Commit `feat(documents): public access request form, library moved to /documents/library`.

---

### Task 6: Grant access routes and file route

**Files:**
- Create: `src/app/(site)/documents/access/[token]/route.ts`, `src/app/(site)/documents/shared/page.tsx`, `src/app/(site)/documents/shared/SharedLibrary.tsx`
- Modify: `src/app/api/documents/[id]/file/route.ts`

**Interfaces:**
- Consumes: `lookupByToken`, `resolveGrant`, `listGrantedDocuments`, `findGrantedDocument`, `GRANT_COOKIE`, `encodeGrantCookie`, `grantCookieMaxAge`.
- Produces: `GET /documents/access/<requestId>.<rawToken>` (the emailed link carries the request id and raw token as one path segment, built by `approvalLink`). The route splits it on the first `.`, calls `lookupByToken`; on success sets cookie `GRANT_COOKIE` (HttpOnly, Secure in production, SameSite=Lax, Path=`/`, Max-Age from `grantCookieMaxAge`) and redirects to `/documents/shared`; on failure redirects to `/documents?link=invalid`. All responses `Cache-Control: private, no-store`.

- [ ] **Step 1:** Implement the route handler (`await cookies()` then `.set`, per `cookies.md`; awaited `ctx.params` as in the file route).
- [ ] **Step 2:** `shared/page.tsx` (server component, inside `Suspense`, `await connection()`): `resolveGrant` from the cookie; none → `redirect("/documents?link=invalid")`; exactly one granted document → `redirect("/api/documents/<id>/file")`; otherwise render `SharedLibrary` (client; the same list/search UI as the staff library, without the sign-out form, headed "Shared with <email>").
- [ ] **Step 3:** Extend the file route: when `getCurrentUser()` is null, call `resolveGrant(cookie)`; no grant → 401 as today; with a grant, `findGrantedDocument(grant, id)` (null → 404), log `DocumentAccess` with `requestId` and `email` and no `userId`. Staff sessions behave exactly as before.
- [ ] **Step 4:** Run `npm run check`; manual check: approve a request (after Task 7), open the link, confirm view/download work, then revoke and confirm the same file URL returns 401.
- [ ] **Step 5:** Commit `feat(documents): emailed-link access and grant-aware file route`.

---

### Task 7: Admin actions

**Files:**
- Create: `src/app/admin/(panel)/document-requests/actions.ts`

**Interfaces:**
- Consumes: Tasks 1-4; `requireActionUser("manageDocuments")`, `runAction`, `createRawToken`, `hashToken`, `approvalLink(requestId, rawToken)`.
- Produces (all return `ActionResult`, all call `revalidatePath("/admin/document-requests")`):
  - `approveRequestAction(id: string, input: { scope: "all" | "selected"; documentIds: string[]; expiryDays: 1 | 7 | 30 | 90 })`: allowed unless currently `valid`; `selected` requires at least one existing document; generates the token, stores `tokenHash`, `expiresAt`, `approvedBy/At`, sets `status: "approved"`, sends `approvalEmail`; if sending fails or is `"unconfigured"`, keeps the approval and returns message `Approved, but the email could not be sent. Use Resend link.`
  - `rejectRequestAction(id: string, note: string)`: only from `pending`; sends `rejectionEmail`.
  - `revokeRequestAction(id: string)`: only from `approved`; sets `status: "revoked"`, `decidedBy/At`, sends `revocationEmail` (errors logged only).
  - `resendRequestAction(id: string)`: only when `valid`; new token replaces the hash (old token dead), expiry unchanged, emails the new link.

- [ ] **Step 1:** Implement the four actions with zod-validated ids and `UserFacingError` for wrong-state calls.
- [ ] **Step 2:** Run `npm run check`.
- [ ] **Step 3:** Commit `feat(documents): admin approve, reject, revoke and resend actions`.

---

### Task 8: Admin Requests page

**Files:**
- Create: `src/app/admin/(panel)/document-requests/page.tsx`, `src/app/admin/(panel)/document-requests/RequestsManager.tsx`
- Modify: `src/components/admin/nav.ts` (add `{ title: "Access Requests", href: "/admin/document-requests", icon: KeyRound, permission: "manageDocuments" }` under Library), `src/app/admin/(panel)/documents/page.tsx` (description text: files are shared by approved access requests, not by sign-in)

**Interfaces:**
- Consumes: `listRequests`, `listAllDocuments`, Task 7 actions. Page pattern: `src/app/admin/(panel)/enquiries/page.tsx` (`requirePageUser("manageDocuments")` inside `Suspense`).

- [ ] **Step 1:** Page header shows the pending count (`countPendingRequests`).
- [ ] **Step 2:** `RequestsManager` (client): status filter tabs (Pending, Approved, Rejected, Revoked, Expired, All; "Expired" = approved with `state === "expired"`); rows show requester, company, requested scope/documents, date, status; row detail shows purpose and decision details. Pending rows: **Approve** dialog (scope radio "Whole library / Selected documents", document checkboxes pre-ticked from the request, expiry select defaulting to 7 days) and **Reject** dialog (optional note). Valid approved rows: **Revoke** (confirm dialog) and **Resend link**. Expired/revoked/rejected rows: **Approve again**. Use the existing dialog, button and toast components as `DocumentsManager.tsx` does.
- [ ] **Step 3:** Run `npm run check && npm run lint`.
- [ ] **Step 4:** Commit `feat(admin): document access requests page`.

---

### Task 9: End-to-end update and final verification

**Files:**
- Modify: `tests/e2e/documents.spec.ts`

- [ ] **Step 1:** Update the existing specs for the moved library: logged-out `/documents` now shows the request form (heading and success message testable without email), `/documents/library` redirects to `/documents/login?next=%2Fdocuments%2Flibrary`, signed-in tests land on `/documents/library`, the file route still returns 401 with no session and no cookie, and VIEWER redirect checks use `/documents/library`.
- [ ] **Step 2:** Add a logged-out spec that submits the form and sees `Thanks. Admin will respond to you very soon by email.`, and a spec that `GET /documents/access/65f000000000000000000000.nope` redirects to `/documents?link=invalid`.
- [ ] **Step 3:** Run `npm test`, `npm run check`, `npm run lint`. Expected: all pass. Run `npx playwright test tests/e2e/documents.spec.ts` if a dev database is available and report the result honestly if it is not.
- [ ] **Step 4:** Walk the flow once in a browser: request, admin approve, open the emailed link (or the link logged when email is unconfigured), view a file, revoke, confirm the file URL now returns 401.
- [ ] **Step 5:** Commit `test(documents): e2e for request flow`.
