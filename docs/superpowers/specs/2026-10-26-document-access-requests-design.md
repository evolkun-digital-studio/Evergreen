# Document access requests: design

## Intent

Today `/documents` is a private library behind a login (Auth.js credentials, roles ADMIN/EDITOR/VIEWER). Outsiders who need a certificate or report must be given an account. We want the opposite flow: anyone can **request** access, an admin reviews the request in the admin panel, and on approval the requester is **emailed a link** that opens exactly what was granted. The admin can **revoke** a grant at any time and it stops working immediately.

Why: no accounts to manage for outsiders, the admin stays in control of who sees what, and every grant is traceable to a named requester.

## Decisions made by the user

- Flow: request, then it goes to the admin panel, then the visitor sees "Admin will respond to you very soon by email".
- On approval the requester is emailed **a direct link** (chosen over a passcode on the strength of simplicity; an optional passcode may be added later, see non-goals).
- Access can be **cancelled afterwards** from the admin panel.
- The request form lets the visitor optionally pick which document(s) they want. If they pick none, the request is for the **whole library**. The admin sees what was asked for and can change what is granted (specific documents, or the whole library).
- The admin panel keeps its **upload section** for documents.
- Document **titles and categories are shown publicly** in the request form's selector (never the files).

## Goals

- Public request form on `/documents` (name, email, company optional, purpose, optional document selection, honeypot, rate limited).
- Confirmation message after submitting: "Thanks. Admin will respond to you very soon by email."
- Admin "Requests" area: list with status filters (pending, approved, rejected, revoked, expired), request detail, approve (with scope and expiry), reject (optional note), revoke.
- Emails: request received (to the requester, short), approved (with link and expiry), rejected (polite), revoked (optional notice). Admin gets an email when a new request arrives, using the existing Resend setup.
- Grant link opens the granted documents with no login; a single document opens straight in the viewer, several or the whole library show a list.
- Revoke and expiry are enforced on every file request, not only when the page loads.
- Existing view/download log keeps working and records the requester's email.

## Non-goals

- No passcode or second factor in this version (can be added to a grant later without reworking the model).
- No self-service account creation for requesters.
- No change to the admin panel's own login, roles or the document upload/edit/activate features.
- No payment, no per-document watermarking.

## Anti-goals

- A revoked or expired link must never still serve a file, including through a cached response or an already-open page's file URL.
- Document titles are public but files, file names and descriptions of non-granted documents must not leak to a requester.
- The form must not reveal whether an email address is already known to the system.

## Constraints and existing code to build on

- Next.js (a newer version with breaking changes: read `node_modules/next/dist/docs/` before writing routes, server actions or `proxy.ts` changes, per `AGENTS.md`).
- MongoDB via Mongoose. Models live in `src/lib/models/` (`document.ts` already has `CompanyDocument` and `DocumentAccess`).
- Email: `src/lib/email.ts` `sendTransactionalEmail` (Resend; returns `"unconfigured"` when env keys are missing, throws on provider rejection). Env: `RESEND_API_KEY`, `ENQUIRY_EMAIL_FROM`, `ENQUIRY_EMAIL_TO`.
- Rate limiting: `src/lib/rate-limit.ts` `hitRateLimit` (Mongo-backed). Contact form (`src/app/(site)/contact/actions.ts`) is the pattern for a public server action with honeypot and rate limit.
- Private file serving: `src/app/api/documents/[id]/file/route.ts` (no-store headers, noindex, access log). Storage via `src/lib/documents/storage.ts`.
- `src/proxy.ts` currently redirects every `/documents*` path to `/documents/login` when there is no session.
- Admin documents UI: `src/app/admin/(panel)/documents/` (`DocumentsManager.tsx`, `actions.ts`, `page.tsx`) and `src/components/admin/nav.ts`; permissions in `src/lib/cms/constants.ts` (`can.manageDocuments`).

## Design

### Data

New model `DocumentAccessRequest` (one row per request; `status` drives everything):

- `name`, `email` (lowercased), `company`, `purpose`
- `requested`: `{ scope: "all" | "selected", documentIds: ObjectId[] }` (what the visitor asked for)
- `status`: `pending | approved | rejected | revoked`
- `grant` (set on approval): `{ scope: "all" | "selected", documentIds: ObjectId[], tokenHash, expiresAt, approvedBy, approvedAt, lastEmailedAt }`
- `decisionNote`, `rejectedBy/rejectedAt`, `revokedBy/revokedAt`
- `ip`/`userAgent` (truncated), timestamps

Expiry is derived: a grant is valid when `status === "approved"` and `expiresAt > now`; the UI shows "expired" without needing a status write.

The access token is 32 random bytes (base64url). Only its SHA-256 hash is stored. The raw token exists only in the email. The existing `DocumentAccess` log gets an optional `requestId` and `userId` becomes optional (grant views have no user); `email` is the requester's.

### Visitor flow

1. `/documents` becomes a public page: short explanation plus the request form. The selector lists active documents (title, category) grouped by category with a "Whole library" default when nothing is ticked.
2. Submit runs a server action: validate, honeypot, rate limit (per IP and per email), create the request, email the admin (`ENQUIRY_EMAIL_TO`) and a receipt to the requester. Email failures are logged, never shown, and never lose the request.
3. Success state shows: "Thanks. Admin will respond to you very soon by email."
4. The response is identical whether or not the email address has asked before.

### Admin flow

- New "Requests" page in the admin panel under Documents (with a pending-count badge in the nav). Gated by `can.manageDocuments`.
- Detail view shows requester details, purpose, what was requested, and prior requests from the same email.
- Approve: pre-filled with what was requested; the admin can switch to "whole library" or tick specific documents, and choose expiry (default 7 days; options 1, 7, 30, 90 days). Approving generates the token, stores the hash, and sends the approval email with the link.
- Reject: optional note, sends the rejection email.
- Revoke (on approved requests): sets `status = revoked`, optional notice email. Takes effect on the next request.
- Re-send link: generates a fresh token (old one invalidated) and re-emails, because the raw token is never stored.
- The existing Documents upload/edit area is unchanged.

### Grant access

- Link: `/documents/access/<token>`. Server-side lookup by token hash. Invalid, revoked, expired and rejected all show the same neutral "This link is no longer valid. You can request access again." page.
- One granted document: the page shows that document with View and Download. Several or the whole library: a list like the current library. For `scope: "all"` the list is computed live from active documents, so new uploads are included.
- Files are served from the existing file route extended to accept a grant: the grant is carried in an HTTP-only cookie set by the access page (so the raw token is not in file URLs or logs beyond the first visit), and the route re-validates the grant and that the document is within scope on **every** request.
- Responses stay `private, no-store`, noindex, as today.

### Existing staff login (my call, flagged)

Existing signed-in users keep working: the current library moves to `/documents/library` (still behind the session) and the file route continues to accept a session as an alternative to a grant. `proxy.ts` is updated so only `/documents/library*` requires a session and `/documents`, `/documents/access/*` are public. The sign-in page stays at `/documents/login`. Admin-panel VIEWER redirect target changes to `/documents/library`.

## Left to the builder

- Exact visual design of the form, selector and emails (match the existing site design and the contact form tone).
- Email copy, within the requirements above.
- Exact validation limits and rate-limit numbers (suggest 5 requests per IP per hour and 3 per email per day).
- Test strategy; cover the grant validity matrix (pending, approved, expired, revoked, rejected, out-of-scope document) and the cache/stale-link anti-goal.

## Calls I made (please check)

- Link valid 7 days by default; the admin can choose another expiry.
- Staff sign-in and the existing library are kept at `/documents/library`; they are not removed.
- Re-sending issues a new token instead of reusing the old one.
- Public selector shows title and category only, not descriptions or file names.
