import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { checkBotId } from 'botid/server'
import { IL_LICENSE_PENDING, isIllinoisRoofingRequest, isRoofingRequest, looksIllinois } from '../../../lib/illinois-guard'
import { checkPhone, isEmailSyntax, emailDomain, PHONE_REASON } from '../../../lib/contact-check'
import { checkEmailDomain, type EmailCheckField } from '../../../lib/email-domain-check'
import { PHONES } from '../../../lib/business'
import { buildCustomerEmail, escapeHtml, introVideoUrl } from '../../../lib/customer-email'

// node:dns (email domain check) needs the Node.js runtime, which is also the Next 16 default.
export const runtime = 'nodejs'

function leadValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

// Accept only plain text (clipped to a sane length) or finite numbers; anything else is stored as null.
function field(value: unknown, max = 200): string | number | null {
  if (typeof value === 'string') return value.trim().slice(0, max) || null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

/** leads.status for a request that looks automated (BotID or sent too fast). It is still saved and emailed. */
const SUSPECTED_BOT = 'suspected_bot'
/** A person needs at least this long to fill in the form; faster submissions are flagged, never dropped. */
const MIN_FORM_MS = 2000

/** Bot check that can never block a lead: an error or timeout counts as "not a bot". */
async function looksAutomated(formMs: unknown): Promise<{ suspected: boolean; reason: string }> {
  if (typeof formMs === 'number' && Number.isFinite(formMs) && formMs >= 0 && formMs < MIN_FORM_MS) {
    return { suspected: true, reason: 'sent too fast' }
  }
  try {
    const verdict = await checkBotId()
    if (verdict.isBot && !verdict.isVerifiedBot) return { suspected: true, reason: 'BotID' }
  } catch (botError) {
    console.error('BOTID CHECK FAILED', { name: botError instanceof Error ? botError.name : 'UnknownError' })
  }
  return { suspected: false, reason: '' }
}
const MAX_BODY_BYTES = 20_000
// Lead-source columns added by the README migration. Until it has run, an insert that carries them fails with
// PGRST204 and is retried once without them, so a lead is never lost whichever happens first (migration or deploy).
const TRACKING_COLUMNS = new Set(['gbraid', 'wbraid', 'referrer'])

export async function POST(req: Request) {
  try {
    if (Number(req.headers?.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    }
    const body = await req.json()
    if (!body || typeof body !== 'object' || typeof body.name !== 'string' || !body.name.trim() ||
        typeof body.phone !== 'string' || !body.phone.trim()) {
      return NextResponse.json({ error: 'name and phone required' }, { status: 400 })
    }
    // Spam trap: the hidden "company" field is invisible to people, so a value means a bot.
    // Answer like a success so the bot moves on, but save and send nothing.
    if (typeof body.company === 'string' && body.company.trim()) {
      console.log('LEAD SPAM TRAP')
      return NextResponse.json({ ok: true })
    }
    if (body.phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'valid phone required' }, { status: 400 })
    }
    // Any other failed phone rule only flags the lead (owner email, CRM note, webhook); it is never rejected.
    const phoneCheck = checkPhone(body.phone)
    const phoneProblem = phoneCheck.ok ? null : phoneCheck.problem
    if (phoneProblem) console.log('LEAD PHONE CHECK', { result: phoneProblem })
    // Illinois rule: no roof work on Illinois homes until the IL roofing license (225 ILCS 335/9). The request is
    // still saved, tagged il_license_pending, and the team email says not to quote or schedule roofing.
    const homeLocation = { city: body.city, address: body.address, estLocation: body.est_location, page: body.page }
    const illinois = looksIllinois(homeLocation)
    const ilLicensePending = isIllinoisRoofingRequest({ ...homeLocation, service: body.service_type ?? body.service, emergency: body.emergency === true })
    // Illinois pages ask "storm damage to siding, gutters or trim?" instead of the roof tarp box.
    const urgentExterior = body.urgent === true
    if (ilLicensePending) console.log('LEAD ILLINOIS ROOFING LICENSE PENDING')
    // Bot protection (Phase 1): a suspected bot is saved and emailed to the team marked POSSIBLE SPAM, but gets
    // no customer email and no ad conversion. A real lead that is wrongly flagged is therefore never lost.
    const bot = await looksAutomated(body.form_ms)
    if (bot.suspected) console.log('LEAD SUSPECTED BOT', { reason: bot.reason })
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Production')
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const email = field(body.email, 254)
    const gbraid = field(body.gbraid, 300)
    const wbraid = field(body.wbraid, 300)
    const referrer = field(body.referrer, 500)
    const lead = {
      name: field(body.name, 100),
      phone: field(body.phone, 30),
      email: typeof email === 'string' && isEmailSyntax(email) ? email : null,
      address: field(body.address),
      city: field(body.city, 80),
      service_type: field(body.service_type ?? body.service, 80),
      issue_type: field(body.issue_type),
      roof_age: field(body.roof_age, 40),
      roof_size: field(body.roof_size ?? body.est_size, 40),
      roof_pitch: field(body.roof_pitch ?? body.est_pitch, 40),
      roof_material: field(body.roof_material ?? body.est_material, 40),
      emergency: body.emergency === true || urgentExterior,
      // Every other lead keeps the table default ("new").
      ...(bot.suspected ? { status: SUSPECTED_BOT } : ilLicensePending ? { status: IL_LICENSE_PENDING } : {}),
      message: field(body.message ?? body.details, 2000),
      // Where the lead came from (campaign tags and ad click IDs from the landing URL).
      utm_source: field(body.utm_source, 120),
      utm_medium: field(body.utm_medium, 120),
      utm_campaign: field(body.utm_campaign, 200),
      utm_term: field(body.utm_term, 200),
      utm_content: field(body.utm_content, 200),
      gclid: field(body.gclid, 300),
      fbclid: field(body.fbclid, 300),
      landing_page: field(body.landing_page, 500),
      page_url: field(body.page, 500),
      // Only present when sent, so a lead without them never touches the new columns.
      ...(gbraid !== null ? { gbraid } : {}),
      ...(wbraid !== null ? { wbraid } : {}),
      ...(referrer !== null ? { referrer } : {}),
    }
    const sourceLabel = [leadValue(lead.utm_source), leadValue(lead.utm_medium), leadValue(lead.utm_campaign)].filter(Boolean).join(' / ')
      || (lead.gclid || lead.gbraid || lead.wbraid ? 'Google Ads click' : lead.fbclid ? 'Facebook / Instagram click' : 'Direct or unknown')
    // The email domain check runs alongside the save, never rejects and gives up after 1.5 s.
    const emailCheckPending: Promise<EmailCheckField> = lead.email ? checkEmailDomain(lead.email).catch(() => 'unknown' as const) : Promise.resolve('none' as const)
    const firstTry = await supabase.from('leads').insert([lead])
    let error = firstTry.error
    if (error?.code === 'PGRST204' && Object.keys(lead).some((key) => TRACKING_COLUMNS.has(key))) {
      console.error('SUPABASE INSERT RETRY WITHOUT gbraid/wbraid/referrer (run the README lead-source migration)', { code: error.code })
      const retry = await supabase.from('leads').insert([Object.fromEntries(Object.entries(lead).filter(([key]) => !TRACKING_COLUMNS.has(key)))])
      error = retry.error
    }
    if (error) {
      console.error('SUPABASE INSERT FAILED', { code: error.code })
      return NextResponse.json({ error: 'Unable to save lead' }, { status: 500 })
    }
    const emailCheck = await emailCheckPending.catch(() => 'unknown' as const)
    const mailDomain = lead.email ? emailDomain(lead.email) : ''
    if (emailCheck === 'no_mail_server') console.log('LEAD EMAIL CHECK', { result: emailCheck })
    // A notification failure must not fail an already-saved lead.
    try {
      if (!process.env.RESEND_API_KEY || !process.env.LEAD_TO_EMAIL) {
        console.error('RESEND CONFIGURATION MISSING: RESEND_API_KEY or LEAD_TO_EMAIL')
      } else {
        const fields = [
          ...(bot.suspected ? [['Possible spam', `YES - looks automated (${bot.reason}). Saved anyway; no confirmation email was sent to the address given. Check before calling.`]] : []),
          ...(ilLicensePending ? [['Illinois License Pending', 'YES - roofing request for an Illinois home. Do NOT quote, schedule or do any roof work. Call back fast, help with exterior work, and point roof needs to a licensed Illinois roofer.']] : []),
          ['Name', leadValue(lead.name)],
          ['Phone', leadValue(lead.phone)],
          ...(phoneProblem ? [['Phone check', `Looks invalid (${PHONE_REASON[phoneProblem]}). Saved anyway; double-check the number before calling.`]] : []),
          ['Email', leadValue(lead.email)],
          ...(emailCheck === 'no_mail_server' ? [['Email check', `No mail server found for ${mailDomain}. Saved anyway; no confirmation email was sent. Confirm the address when you call.`]] : []),
          ['Address', [leadValue(lead.address), leadValue(lead.city)].filter(Boolean).join(', ')],
          ['Service', leadValue(lead.service_type)],
          ['Issue', leadValue(lead.issue_type)],
          ['Age of Roof', leadValue(lead.roof_age)],
          body.emergency === true
            ? ['Emergency Tarp Needed', ilLicensePending ? 'YES - Emergency (Illinois: no roof tarp; call back fast)' : 'YES - Emergency']
            : urgentExterior
              ? ['Urgent', 'YES - storm damage to siding, gutters or trim (call back fast)']
              : ['Emergency Tarp Needed', 'No'],
          ['Roof Size', leadValue(lead.roof_size)],
          ['Pitch', leadValue(lead.roof_pitch)],
          ['Material', leadValue(lead.roof_material)],
          ['Message', leadValue(lead.message)],
          ['Source', sourceLabel],
          ['Landing Page', leadValue(lead.landing_page)],
          ['Form Page', leadValue(lead.page_url)],
        ]
        const resend = new Resend(process.env.RESEND_API_KEY)
        const ownerEmail = {
          from: 'RoofingnearmeSTL <leads@roofingnearmestl.com>',
          to: process.env.LEAD_TO_EMAIL,
          ...(lead.email ? { replyTo: lead.email } : {}),
          subject: `${bot.suspected ? '[POSSIBLE SPAM] ' : ''}${ilLicensePending ? 'IL ROOFING - LICENSE PENDING - do not quote or schedule roofing - ' : ''}New Roofing Lead: ${leadValue(lead.city)} - ${leadValue(lead.service_type)} - ${leadValue(lead.issue_type)}`.replace(/[\r\n]/g, ' '),
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <img src="https://www.roofingnearmestl.com/logo.png" alt="RoofingnearmeSTL" width="180" />
            <h2>${ilLicensePending ? 'IL License Pending: do not quote or schedule roofing' : 'New Roofing Lead'}</h2>
            <table style="width:100%;border-collapse:collapse">${fields.map(([label, value]) =>
              `<tr><th style="text-align:left;padding:8px 0">${escapeHtml(label)}:</th><td>${escapeHtml(value).replace(/\r?\n/g, '<br>')}</td></tr>`
            ).join('')}</table>
          </div>`,
          text: fields.map(([label, value]) => `${label}: ${value}`).join('\n'),
        }
        // One automatic retry: a brief Resend hiccup must not cost a lead. The daily lead check
        // (/api/lead-check) alerts Mike if a saved lead still has no delivered team email.
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const { data: emailData, error: emailError } = await resend.emails.send(ownerEmail)
            if (!emailError) {
              console.log('LEAD EMAIL SENT', { id: emailData?.id, attempt })
              break
            }
            console.error('RESEND EMAIL FAILED', { name: emailError.name, attempt })
          } catch (sendError) {
            console.error('RESEND EMAIL CRASH', { name: sendError instanceof Error ? sendError.name : 'UnknownError', attempt })
          }
          if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 1500))
        }
      }
    } catch (emailError) {
      console.error('RESEND EMAIL CRASH', { name: emailError instanceof Error ? emailError.name : 'UnknownError' })
    }
    // One combined follow-up email to the customer (FUP-01); RoofLink sends none. Sent the moment the lead is saved
    // (only when they gave an email). Transactional: it answers their own request. Replies go to the owner's inbox.
    // Must not fail a saved lead.
    try {
      // Only when the owner inbox is set: the owner must get the lead, and replies need somewhere to go.
      // Never to a suspected bot: the form must not be usable to send our email to strangers.
      if (lead.email && emailCheck === 'no_mail_server') console.log('CUSTOMER CONFIRMATION SKIPPED', { reason: 'no_mail_server' })
      if (lead.email && !bot.suspected && emailCheck !== 'no_mail_server' && process.env.RESEND_API_KEY && process.env.LEAD_TO_EMAIL) {
        const firstName = leadValue(lead.name).split(/\s+/)[0] || 'there'
        const service = leadValue(lead.service_type)
        const place = leadValue(lead.city)
        const videoUrl = introVideoUrl(process.env.INTRO_VIDEO_URL)
        if (process.env.INTRO_VIDEO_URL?.trim() && !videoUrl) console.error('INTRO_VIDEO_URL IGNORED: must be an https:// link')
        const customerEmail = buildCustomerEmail({
          firstName, service, place, customerPhone: leadValue(lead.phone),
          illinois, ilLicensePending, emergencyTarp: body.emergency === true, leadEmergency: lead.emergency === true, urgentExterior,
          roofing: !illinois && isRoofingRequest(lead.service_type, body.emergency === true),
          videoUrl, phones: { IL: PHONES.IL.display, MO: PHONES.MO.display },
        })
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { data: confirmData, error: confirmError } = await resend.emails.send({
          from: 'RoofingnearmeSTL <leads@roofingnearmestl.com>',
          to: lead.email,
          replyTo: process.env.LEAD_TO_EMAIL,
          subject: customerEmail.subject,
          html: customerEmail.html,
          text: customerEmail.text,
        })
        if (confirmError) {
          console.error('CUSTOMER CONFIRMATION FAILED', { name: confirmError.name })
        } else {
          console.log('CUSTOMER CONFIRMATION SENT', { id: confirmData?.id })
        }
      }
    } catch (confirmError) {
      console.error('CUSTOMER CONFIRMATION CRASH', { name: confirmError instanceof Error ? confirmError.name : 'UnknownError' })
    }
    // Optional text alert via Twilio; skipped until all four variables are set. Must not fail a saved lead.
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID
      const token = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_FROM_NUMBER
      const to = process.env.LEAD_ALERT_PHONE
      if (sid && token && from && to) {
        const text = `${bot.suspected ? 'POSSIBLE SPAM - ' : ''}${ilLicensePending ? 'IL LICENSE PENDING - no roof work - ' : ''}${lead.emergency === true ? 'EMERGENCY - ' : ''}New roofing lead: ${[
          leadValue(lead.name), leadValue(lead.phone), leadValue(lead.city), leadValue(lead.service_type), leadValue(lead.issue_type),
        ].filter(Boolean).join(' | ')}`.replace(/[\r\n]+/g, ' ').slice(0, 320)
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ From: from, To: to, Body: text }).toString(),
        })
        if (!res.ok) console.error('LEAD SMS FAILED', { status: res.status })
      }
    } catch (smsError) {
      console.error('LEAD SMS CRASH', { name: smsError instanceof Error ? smsError.name : 'UnknownError' })
    }
    // Optional: send the saved lead to the CRM. LEAD_WEBHOOK_URL is the n8n CRM webhook that
    // posts rooflink_job_json to RoofLink's "Create a new job" API (POST /light/public/jobs/).
    // Skipped until the variable is set. Must not fail or slow down a saved lead for long.
    try {
      const hook = process.env.LEAD_WEBHOOK_URL
      if (hook && !hook.startsWith('https://')) {
        console.error('LEAD WEBHOOK URL MUST START WITH https://')
      } else if (hook) {
        const [firstName, ...rest] = leadValue(lead.name).split(/\s+/)
        const location = leadValue(field(body.est_location, 80)) || leadValue(lead.city)
        const state = /\bIL\b|illinois/i.test(location) ? 'IL' : /\bMO\b|missouri/i.test(location) ? 'MO' : ''
        const cityName = leadValue(lead.city) || location.split(',')[0].trim()
        const service = leadValue(lead.service_type)
        const estimate = leadValue(field(body.est_price))
        // RoofLink needs a first name and an address; without a street, the city is used and the note says so.
        const rooflinkJob = {
          name: `${leadValue(lead.name)} - ${service || 'Website lead'}`,
          job_type: 'r',
          ...(/repair/i.test(service) ? { bid_type: 'r' } : {}),
          address: leadValue(lead.address) || [cityName, state].filter(Boolean).join(', ') || 'Address not given',
          ...(cityName ? { city: cityName } : {}),
          ...(state ? { state } : {}),
          customer: {
            first_name: firstName || 'Website',
            ...(rest.length ? { last_name: rest.join(' ') } : {}),
            phone: leadValue(lead.phone),
            ...(lead.email ? { email: lead.email } : {}),
          },
          platform: 'Website',
          ...(lead.utm_campaign ? { campaign_name: leadValue(lead.utm_campaign) } : {}),
          note: {
            message: [
              'Website lead from roofingnearmestl.com',
              ilLicensePending ? 'ILLINOIS LICENSE PENDING - do not quote or schedule roofing' : '',
              // Same wording as the owner email: Illinois never gets a roof tarp promise.
              body.emergency === true
                ? ilLicensePending ? 'EMERGENCY - Illinois: no roof tarp; call back fast' : 'EMERGENCY - needs a tarp now'
                : urgentExterior ? 'URGENT - storm damage to siding, gutters or trim (call back fast)' : '',
              service && `Service: ${service}`,
              leadValue(lead.issue_type) && `Issue: ${leadValue(lead.issue_type)}`,
              !leadValue(lead.address) && 'No street address given - call to confirm',
              phoneProblem ? `Phone check: looks invalid (${PHONE_REASON[phoneProblem]}) - double-check before calling` : '',
              emailCheck === 'no_mail_server' ? `Email check: no mail server found for ${mailDomain} - confirm the address` : '',
              leadValue(lead.roof_age) && `Age of roof: ${leadValue(lead.roof_age)}`,
              leadValue(lead.roof_size) && `Estimator: ${[leadValue(lead.roof_size), leadValue(lead.roof_pitch), leadValue(lead.roof_material)].filter(Boolean).join(', ')}`,
              estimate && `Estimate shown: ${Number(estimate).toLocaleString('en-US')}`,
              leadValue(lead.message) && `Message: ${leadValue(lead.message)}`,
              `Source: ${sourceLabel}`,
              leadValue(lead.page_url) && `Form page: ${leadValue(lead.page_url)}`,
            ].filter(Boolean).join('\n'),
          },
        }
        // Shared secret for the receiver; server-only, never logged. No header when unset.
        const hookSecret = process.env.LEAD_WEBHOOK_SECRET?.trim()
        const res = await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(hookSecret ? { 'X-Webhook-Secret': hookSecret } : {}) },
          body: JSON.stringify({
            ...lead,
            first_name: firstName,
            last_name: rest.join(' '),
            state,
            estimator_location: field(body.est_location, 80),
            estimate_price: field(body.est_price),
            estimate_low: field(body.est_price_low),
            estimate_high: field(body.est_price_high),
            lead_source: sourceLabel,
            website: 'roofingnearmestl.com',
            submitted_at: new Date().toISOString(),
            phone_check: phoneProblem ? 'invalid' : 'ok',
            email_check: emailCheck,
            rooflink_job_json: JSON.stringify(rooflinkJob),
          }),
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) console.error('LEAD WEBHOOK FAILED', { status: res.status })
      }
    } catch (hookError) {
      console.error('LEAD WEBHOOK CRASH', { name: hookError instanceof Error ? hookError.name : 'UnknownError' })
    }
    // Tells the form which thank-you page to show (a license-pending lead is not reported as an ad conversion).
    return NextResponse.json({ ok: true, ...(bot.suspected ? { suspected: true } : {}), ...(ilLicensePending ? { area: 'il-pending' } : illinois ? { area: 'il' } : {}) })
  } catch (error) {
    console.error('LEAD API FAILED', { name: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: 'Unable to submit lead' }, { status: 500 })
  }
}
