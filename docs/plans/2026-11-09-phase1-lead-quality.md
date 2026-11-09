# Phase 1 lead quality (FORM-01, FORM-02, FORM-03, CRM-03 website side)

Branch: `feature/phase1-lead-quality`

## Goal

- FORM-01: inline field errors (name, phone, email) on blur and submit, linked with `aria-invalid` and
  `aria-describedby`; focus goes to the first invalid field on a failed submit. Native `required`/`pattern` stay.
- FORM-02: one shared phone check (`src/lib/contact-check.ts`) used by browser and server. Browser blocks invalid
  numbers; server keeps the 400 for fewer than 10 digits and otherwise saves and flags the lead.
- FORM-03: email stays optional. Browser suggests common-domain typo fixes (button, never silent). Server checks the
  domain's mail records (`node:dns/promises`, 1.5 s cap, run alongside the save). Only `no_mail_server` skips the
  customer confirmation and adds an owner "Email check" line.
- CRM-03 (website side): `X-Webhook-Secret` header when `LEAD_WEBHOOK_SECRET` is set; payload fields `phone_check`
  and `email_check`.

## Webhook contract (shared with the n8n workstream)

- POST JSON to `LEAD_WEBHOOK_URL` (https only, 5 s timeout), header `Content-Type: application/json`.
- Header `X-Webhook-Secret: <value>` only when `LEAD_WEBHOOK_SECRET` is set (trimmed); otherwise no header.
- New fields: `phone_check` = `ok` | `invalid`; `email_check` = `ok` | `no_mail_server` | `unknown` | `none`.
- Existing fields unchanged, including `rooflink_job_json` and `status`.
- RoofLink note lines added only when flagged: `Phone check: looks invalid (<reason>) - double-check before calling`,
  `Email check: no mail server found for <domain> - confirm the address`.

## Files

- New: `src/lib/contact-check.ts`, `src/lib/email-domain-check.ts`, `tests/contact-check.test.mjs`,
  `tests/email-domain-check.test.mjs`, `e2e/lead-form-validation.spec.ts`.
- Changed: `src/app/api/lead/route.ts`, `src/components/lead-form.tsx`, `tests/lead-route.test.mjs`,
  `e2e/lead-form.spec.ts`, `README.md`, `docs/security-and-recovery.md`, `docs/verification.md`.

## Decisions

- No database columns change; flags live in the owner email, the webhook and the CRM note only.
- Email subject lines are unchanged (the daily lead check matches on them).
- The email check starts before the insert and is awaited only after a successful insert.
- The route sets `runtime = 'nodejs'` explicitly (also the Next 16 default).
- Local Playwright: `CI=1 npm run check` (uses bundled Chromium; Edge is not installed on every machine).
- e2e tests use fictional-free numbers (555-2368) because 555-0100..0199 are now rejected.

## Out of scope

Database columns for the flags, SMS text changes, thank-you/conversion changes for flagged leads, auto-correcting
emails, disposable-email or carrier lookups, and the n8n side of CRM-03.

## Status checklist

- [x] Shared check module and unit tests
- [x] Email domain check module and unit tests
- [x] Lead route: flags, skipped confirmation, webhook secret and fields
- [x] Route unit tests extended
- [x] Lead form inline errors, focus and typo suggestion
- [x] Playwright tests (desktop and phone)
- [x] README, security and verification docs
- [x] `CI=1 npm run check` green
