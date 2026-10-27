# SMTP authentication investigation

## Contract and symptom

- Contract: approving a document request persists the grant, then sends its access link through the SMTP configuration loaded by Next.js.
- Symptom: the grant is persisted and the server action returns HTTP 200, but Nodemailer reports `EAUTH`, SMTP response `535 Incorrect authentication data`, on command `AUTH PLAIN`.
- Initial boundary: the SMTP server was reached and rejected authentication; the document workflow itself completed and deliberately preserved the manual link.

## Evidence log

- `rg` located the mail boundary in `src/lib/email.ts` and failure handling in `src/app/admin/(panel)/document-requests/actions.ts`.
- `src/lib/email.ts` passes `SMTP_USER` and `SMTP_PASS` directly to Nodemailer and uses port-derived TLS (`465` secure; otherwise STARTTLS).
- The action catches mail errors, logs them, and returns `{ emailed: false, link }`; therefore the HTTP 200 is expected and is not evidence of successful email delivery.
- Next.js local documentation confirms root `.env*` loading and precedence: process environment, `.env.development.local`, `.env.local`, `.env.development`, `.env`.
- A first inline Node inspection command exited 1 because PowerShell quoting removed JavaScript string quotes; it did not reach environment inspection and does not bear on the SMTP symptom.
- The first file-based environment probe exited 1 before inspection because this installed `@next/env` build exposes a CommonJS default export. The probe was corrected to destructure `loadEnvConfig` from that default export.
- The corrected probe exited 0. All six mail variables come from root `.env` (not `.env.local`). Effective transport is `103-139-59-226.cprapid.com:465` with implicit TLS. Username and password are set and have no leading/trailing whitespace; the password length is 28. This rules out missing auth fields, wrong local env-file precedence, whitespace around the secret, and a 465/STARTTLS mismatch.
- The first non-sending `transporter.verify()` probe produced no output within the command window, so it was inconclusive. Explicit SMTP connection, greeting, and socket timeouts were added before retrying.
- The sandboxed retry also hung at the network boundary and was interrupted (exit 1, no SMTP output). An approved unsandboxed retry reached the configured server and independently reproduced the exact failure: `EAUTH`, response code 535, command `AUTH PLAIN`. No message was sent.
- The effective SMTP username is a full `@evergreenrecycler.in` mailbox and exactly matches the address inside `ENQUIRY_EMAIL_FROM`. This rules out the common cPanel mistakes of using only the mailbox local part or authenticating as a different From address.

## Verdict

- Verified cause boundary: the configured SMTP server accepts the TLS connection but rejects the configured mailbox credentials. This is not a Next.js Server Action, recipient-address, token-generation, or TLS-mode failure.
- Most likely account-side causes (not distinguishable from SMTP response 535 alone): the `.env` password no longer matches the mailbox password, the mailbox was disabled/locked, or the hosting provider changed the SMTP credentials.
- Smallest corrective action: validate/reset the configured `@evergreenrecycler.in` mailbox password in the hosting control panel/webmail, replace `SMTP_PASS` in the active runtime environment, and restart the Next.js server before rerunning the non-sending verification or `npm run email:test -- <recipient>`.
- Focused unit check: the first sandboxed Vitest invocation could not read the config due to sandbox permissions (exit 1). The approved retry outside the sandbox passed all 9 tests in `tests/unit/email.test.ts` (exit 0), supporting that transport construction and failure propagation behave as intended.
- Temporary environment/auth probe scripts were deleted after use. No application or environment file was changed.

## Follow-up: credentials reported correct

- User reports that the configured username and password are correct.
- Hypothesis A: cPanel rejects Nodemailer's preferred `AUTH PLAIN` but permits `AUTH LOGIN`. Prediction: a non-sending verification forced to LOGIN succeeds; falsifier: the same 535 response on `AUTH LOGIN`.
- Hypothesis B: the configured SMTP host does not own or permit this mailbox despite correct credentials elsewhere. Prediction: both supported password auth methods fail against this host; confirmation requires the hosting panel's exact outgoing-server hostname or server-side mail log.
- Hypothesis C: public DNS is broken. Local resolver and Cloudflare returned SERVFAIL for MX/A/NS queries. Google DNS-over-HTTPS independently returned status 2 with extended error `At delegation evergreenrecycler.in for evergreenrecycler.in/mx`. This is a verified domain DNS problem, but it does not itself explain the current 535 because the configured cPanel hostname resolves and accepts the TLS/auth exchange directly.
- AUTH-method experiment: the approved non-sending verification forced to `AUTH LOGIN` and reproduced `535 Incorrect authentication data` (exit 1). The failure is not specific to Nodemailer's preferred `AUTH PLAIN`; Hypothesis A is falsified.
- Hypothesis D: the password is correct as typed in `.env` but dotenv/Next.js changes it (for example, `$` expansion or an unquoted `#`). Prediction: the parsed/effective secret differs from the source representation in a way that preserves neither its intended length nor value.
- Secret-shape experiment exited 0 without printing the credential: the raw `.env` right-hand side, dotenv-parsed value, and Next.js-effective password are all 28 characters and the parsed/effective values are identical. The raw value is unquoted and contains no `$`, `#`, or backslash. Hypothesis D is falsified.

## Follow-up verdict

- Both SMTP password mechanisms offered by the server (`PLAIN` and `LOGIN`) reach the server and receive the same 535 rejection. The exact secret reaches Nodemailer unchanged.
- Given the user's confirmation that the mailbox username/password themselves are correct, the remaining supported boundary is hosting-side: the configured cPanel hostname may not be the server that owns that mailbox, SMTP authentication may be disabled/blocked for the mailbox or source IP, or the account may be suspended/locked in Exim/cPHulk. The SMTP reply does not distinguish these cases; the hosting panel's **Connect Devices / Manual Settings** page or server mail-auth log is the next authoritative evidence.
- Separately, the domain currently has a public DNS delegation SERVFAIL and needs DNS/nameserver repair. That will affect domain and mail reliability even after SMTP authentication is repaired.
- Temporary follow-up probes were deleted. No application or environment file was changed.
