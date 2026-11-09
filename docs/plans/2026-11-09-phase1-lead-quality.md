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

## Follow-up, Nov 9 2026: owner decisions (FORM-03b, FUP-01, ATT-01)

This section supersedes the earlier "FORM-03: email stays optional" and "No database columns change" lines above.

### As built

1. **FORM-03b, email required in the browser.** The email field now sits right after phone ("Email *", `type=email`,
   native `required`, inline error, typo suggestion). `src/lib/contact-check.ts` returns a plain "please enter your
   email" message for an empty email. The server still saves a lead that arrives without an email (old cached pages,
   no JavaScript); `email_check` stays `none` for it and no customer email is sent.
2. **FUP-01, one combined follow-up email** from the website (RoofLink sends none). It replaces the old instant
   confirmation, keeps the same subject, reply-to and send conditions, and is built by `src/lib/customer-email.ts`.
   An optional intro video link appears only when `INTRO_VIDEO_URL` is an https link.
3. **ATT-01, three tracking fields.** The browser captures `gbraid` and `wbraid` like `gclid` (first touch, 30 days)
   and the referring website (another site only, first landing, 500 characters). The server stores `gbraid`/`wbraid`
   (300) and `referrer` (500), and a `gbraid` or `wbraid` is labelled "Google Ads click". If the insert fails with
   `PGRST204` the insert is retried once without the three fields.
4. **Settings and docs.** README (migration SQL, `INTRO_VIDEO_URL`), `docs/verification.md` rows, privacy page.

### Decisions

- The server never rejects a missing email.
- The three tracking keys are only put in the row when they have a value, so leads without them never touch the new columns.
- PGRST204 retry: once, only when the row carries one of the three fields; logs the error code only. Any other error is unchanged (500).
- Owner/team email and its subject are unchanged (the daily lead check matches on it).
- One video for Missouri and Illinois leads: it must not mention roofs, prices, tarps or response times.
- Existing tests that pin customer wording: none needed changing; every pinned phrase is kept in the new copy.
  Tests edited for other reasons: `tests/contact-check.test.mjs` (empty email is now an error), `tests/lead-route.test.mjs`
  (harness loads the business and customer-email modules; per-call insert errors; form pieces list), and the e2e
  tests (every submitting test fills an email; no more "Add more details" clicks).

### Webhook contract addition

`gbraid`, `wbraid` and `referrer` are included in the webhook body when present (additive; the receiver should ignore
unknown fields). `email_check` is `none` for a lead without an email.

### Files

New: `src/lib/customer-email.ts`, `tests/customer-email.test.mjs`.
Changed: `src/lib/contact-check.ts`, `src/app/api/lead/route.ts`, `src/components/lead-form.tsx`,
`src/app/privacy/page.tsx`, `tests/contact-check.test.mjs`, `tests/lead-route.test.mjs`,
`e2e/lead-form-validation.spec.ts`, `e2e/lead-form.spec.ts`, `README.md`, `docs/verification.md`, this plan.

### Customer email copy (for Mike's approval)

Subject: `We got your request - RoofingnearmeSTL`. From `RoofingnearmeSTL <leads@roofingnearmestl.com>`, reply-to the
owner inbox. Sent only when the lead has an email, is not a suspected bot, the email check is not "no_mail_server",
and Resend is configured. `{First name}` is the first word of the name (or "there"); " for {service}" and " in {town}"
are left out when empty; `{phone}` is the number the homeowner typed. The HTML version has the same text (list headings
in bold, bullet lists, and for the video a "Watch Mike's hello" button plus a copy-the-link line).

When `INTRO_VIDEO_URL` is set (variant A2), this block goes right after the phone line (or, in G, right after the
"What happens next" paragraph):

```text
Meet Mike, the owner, in a short hello video:
{VIDEO LINK}
```

### A. Missouri roofing (no video)

```text
Hi {First name},

Thanks for contacting RoofingnearmeSTL. We received your request for {service} in {town}.

What happens next: during business hours, we call as soon as your request comes in. Someone from our local team will call you at {phone} to set up your free inspection.

Need us sooner? Call 314-202-7663.

At your free inspection:
- If you can, have whoever makes decisions about the home there, so you can go over what we find together.
- We take photos as we go and walk you through what we find before you decide anything. You also get your Free Photo-Documented Roof Report.

Help us get ready (only if it's easy). Reply to this email with:
- Photos of the problem area
- The best times to reach you
- Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house

Questions about your roof? Just reply to this email.

Thank you,
RoofingnearmeSTL (Roofing Near Me STL LLC)



RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois 618-612-5192 · Missouri 314-202-7663 · roofingnearmestl.com
You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know.
```

### A2. Missouri roofing, with video (INTRO_VIDEO_URL set)

```text
Hi {First name},

Thanks for contacting RoofingnearmeSTL. We received your request for {service} in {town}.

What happens next: during business hours, we call as soon as your request comes in. Someone from our local team will call you at {phone} to set up your free inspection.

Need us sooner? Call 314-202-7663.

Meet Mike, the owner, in a short hello video:
{VIDEO LINK}

At your free inspection:
- If you can, have whoever makes decisions about the home there, so you can go over what we find together.
- We take photos as we go and walk you through what we find before you decide anything. You also get your Free Photo-Documented Roof Report.

Help us get ready (only if it's easy). Reply to this email with:
- Photos of the problem area
- The best times to reach you
- Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house

Questions about your roof? Just reply to this email.

Thank you,
RoofingnearmeSTL (Roofing Near Me STL LLC)



RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois 618-612-5192 · Missouri 314-202-7663 · roofingnearmestl.com
You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know.
```

### B. Missouri emergency tarp box checked (video block, if set, goes after the 24/7 line exactly as in A2)

```text
Hi {First name},

Thanks for contacting RoofingnearmeSTL. We received your request for {service} in {town}.

What happens next: during business hours, we call as soon as your request comes in. Someone from our local team will call you at {phone} to set up your free inspection.

If water is coming in right now, call our 24/7 emergency line: 314-202-7663.

At your free inspection:
- If you can, have whoever makes decisions about the home there, so you can go over what we find together.
- We take photos as we go and walk you through what we find before you decide anything. You also get your Free Photo-Documented Roof Report.

Help us get ready (only if it's easy). Reply to this email with:
- Photos of the problem area
- The best times to reach you
- Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house

Questions about your roof? Just reply to this email.

Thank you,
RoofingnearmeSTL (Roofing Near Me STL LLC)



RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois 618-612-5192 · Missouri 314-202-7663 · roofingnearmestl.com
You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know.
```

### C. Missouri exterior trades (siding, gutters, soffit and fascia)

```text
Hi {First name},

Thanks for contacting RoofingnearmeSTL. We received your request for {service} in {town}.

What happens next: during business hours, we call as soon as your request comes in. Someone from our local team will call you at {phone} to set up a free siding, gutter or soffit & fascia estimate.

Need us sooner? Call 314-202-7663.

At your free estimate:
- If you can, have whoever makes decisions about the home there, so you can go over what we find together.
- We take photos as we go and walk you through what we find before you decide anything.

Help us get ready (only if it's easy). Reply to this email with:
- Photos of the problem area
- The best times to reach you
- Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house

Questions about your project? Just reply to this email.

Thank you,
RoofingnearmeSTL (Roofing Near Me STL LLC)



RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois 618-612-5192 · Missouri 314-202-7663 · roofingnearmestl.com
You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know.
```

### D. Illinois exterior, not urgent

```text
Hi {First name},

Thanks for contacting RoofingnearmeSTL. We received your request for {service} in {town}.

What happens next: during business hours, we call as soon as your request comes in. Someone from our local team will call you at {phone} to set up a free siding, gutter or soffit & fascia estimate.

Need us sooner? Call 618-612-5192.

At your free estimate:
- If you can, have whoever makes decisions about the home there, so you can go over what we find together.
- We take photos as we go and walk you through what we find before you decide anything.

Help us get ready (only if it's easy). Reply to this email with:
- Photos of the problem area
- The best times to reach you
- Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house

Questions about your project? Just reply to this email.

Thank you,
RoofingnearmeSTL (Roofing Near Me STL LLC)



RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois 618-612-5192 · Missouri 314-202-7663 · roofingnearmestl.com
You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know.
```

### E. Illinois urgent exterior

```text
Hi {First name},

Thanks for contacting RoofingnearmeSTL. We received your request for {service} in {town}.

What happens next: during business hours, we call as soon as your request comes in. Someone from our local team will call you at {phone} to set up a free siding, gutter or soffit & fascia estimate.

You marked this as urgent storm damage, so we'll call you back as fast as we can. Need us sooner? Call 618-612-5192.

At your free estimate:
- If you can, have whoever makes decisions about the home there, so you can go over what we find together.
- We take photos as we go and walk you through what we find before you decide anything.

Help us get ready (only if it's easy). Reply to this email with:
- Photos of the problem area
- The best times to reach you
- Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house

Questions about your project? Just reply to this email.

Thank you,
RoofingnearmeSTL (Roofing Near Me STL LLC)



RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois 618-612-5192 · Missouri 314-202-7663 · roofingnearmestl.com
You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know.
```

### F. Illinois license-pending (roofing service, no tarp box)

```text
Hi {First name},

Thanks for contacting RoofingnearmeSTL. We received your request for {service} in {town}.

What happens next: during business hours, we call as soon as your request comes in. Someone from our local team will call you at {phone}. If your roof needs work now, we'll point you to a licensed Illinois roofer, and we can help right away with siding, gutters, soffit, fascia and other exterior work.

Need us sooner? Call 618-612-5192.

If we come out for siding, gutter, soffit or fascia work:
- If you can, have whoever makes decisions about the home there, so you can go over what we find together.
- We take photos as we go and walk you through what we find before you decide anything.

Help us get ready (only if it's easy). Reply to this email with:
- Photos of the problem area
- The best times to reach you
- Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house

Questions about your home? Just reply to this email.

Thank you,
RoofingnearmeSTL (Roofing Near Me STL LLC)

Roofing in Illinois is pending our Illinois roofing license, which we expect soon. Until then we don't quote, schedule or do roof work on Illinois homes. We've saved your request and will reach out when roofing opens for Illinois.



RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois 618-612-5192 · Missouri 314-202-7663 · roofingnearmestl.com
You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know.
```

### G. Illinois license-pending emergency (tarp box checked)

```text
Hi {First name},

Thanks for contacting RoofingnearmeSTL. We received your request for {service} in {town}.

We're local and we'll call you at {phone} as soon as we can. If water is coming in, call us at 618-612-5192 and we'll point you to a licensed Illinois roofer right away.

If we come out for siding, gutter, soffit or fascia work:
- If you can, have whoever makes decisions about the home there, so you can go over what we find together.
- We take photos as we go and walk you through what we find before you decide anything.

Help us get ready (only if it's easy). Reply to this email with:
- Photos of the problem area
- The best times to reach you
- Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house

Questions about your home? Just reply to this email.

Thank you,
RoofingnearmeSTL (Roofing Near Me STL LLC)

Roofing in Illinois is pending our Illinois roofing license, which we expect soon. Until then we don't quote, schedule or do roof work on Illinois homes. We've saved your request and will reach out when roofing opens for Illinois.



RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois 618-612-5192 · Missouri 314-202-7663 · roofingnearmestl.com
You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know.
```

### Out of scope

Running the Supabase migration, setting `INTRO_VIDEO_URL`, recording the video, per-state videos, a server-side email
requirement, changes to the owner email or SMS, GA4 enhanced conversions, and the thank-you page timing line.

### Status checklist

- [x] Contact check: empty email is an error
- [x] `src/lib/customer-email.ts` and tests
- [x] Lead route: combined email, tracking fields, PGRST204 retry
- [x] Route unit tests
- [x] Lead form: email required and moved, gbraid/wbraid/referrer
- [x] Privacy page, README, verification rows
- [x] Playwright tests (desktop and phone)
- [x] `CI=1 npm run check` green
- [ ] Mike approves the email wording
- [ ] Mike runs the README migration in Supabase
- [ ] `INTRO_VIDEO_URL` set after the video is posted
- [ ] Test lead per the Brain-Data test-lead playbook
