import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { ILLINOIS_ROOFING_MESSAGE, illinoisRoofingBlocked } from '../../../lib/illinois-guard'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

function leadValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

// Accept only plain text (clipped to a sane length) or finite numbers; anything else is stored as null.
function field(value: unknown, max = 200): string | number | null {
  if (typeof value === 'string') return value.trim().slice(0, max) || null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/
const MAX_BODY_BYTES = 20_000

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
    // Illinois rule (Engineering Package 001): no roofing requests for Illinois properties until the IL license.
    if (illinoisRoofingBlocked({ service: body.service_type ?? body.service, emergency: body.emergency === true,
      city: body.city, address: body.address, estLocation: body.est_location, page: body.page })) {
      console.log('LEAD ILLINOIS ROOFING REFUSED')
      return NextResponse.json({ error: 'illinois_roofing', message: ILLINOIS_ROOFING_MESSAGE }, { status: 422 })
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Production')
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const email = field(body.email, 254)
    const lead = {
      name: field(body.name, 100),
      phone: field(body.phone, 30),
      email: typeof email === 'string' && EMAIL.test(email) ? email : null,
      address: field(body.address),
      city: field(body.city, 80),
      service_type: field(body.service_type ?? body.service, 80),
      issue_type: field(body.issue_type),
      roof_age: field(body.roof_age, 40),
      roof_size: field(body.roof_size ?? body.est_size, 40),
      roof_pitch: field(body.roof_pitch ?? body.est_pitch, 40),
      roof_material: field(body.roof_material ?? body.est_material, 40),
      emergency: body.emergency === true,
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
    }
    const sourceLabel = [leadValue(lead.utm_source), leadValue(lead.utm_medium), leadValue(lead.utm_campaign)].filter(Boolean).join(' / ')
      || (lead.gclid ? 'Google Ads click' : lead.fbclid ? 'Facebook / Instagram click' : 'Direct or unknown')
    const { error } = await supabase.from('leads').insert([lead])
    if (error) {
      console.error('SUPABASE INSERT FAILED', { code: error.code })
      return NextResponse.json({ error: 'Unable to save lead' }, { status: 500 })
    }
    // A notification failure must not fail an already-saved lead.
    try {
      if (!process.env.RESEND_API_KEY || !process.env.LEAD_TO_EMAIL) {
        console.error('RESEND CONFIGURATION MISSING: RESEND_API_KEY or LEAD_TO_EMAIL')
      } else {
        const fields = [
          ['Name', leadValue(lead.name)],
          ['Phone', leadValue(lead.phone)],
          ['Email', leadValue(lead.email)],
          ['Address', [leadValue(lead.address), leadValue(lead.city)].filter(Boolean).join(', ')],
          ['Service', leadValue(lead.service_type)],
          ['Issue', leadValue(lead.issue_type)],
          ['Age of Roof', leadValue(lead.roof_age)],
          ['Emergency Tarp Needed', lead.emergency === true ? 'YES - Emergency' : 'No'],
          ['Roof Size', leadValue(lead.roof_size)],
          ['Pitch', leadValue(lead.roof_pitch)],
          ['Material', leadValue(lead.roof_material)],
          ['Message', leadValue(lead.message)],
          ['Source', sourceLabel],
          ['Landing Page', leadValue(lead.landing_page)],
          ['Form Page', leadValue(lead.page_url)],
        ]
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'RoofingnearmeSTL <leads@roofingnearmestl.com>',
          to: process.env.LEAD_TO_EMAIL,
          ...(lead.email ? { replyTo: lead.email } : {}),
          subject: `New Roofing Lead: ${leadValue(lead.city)} - ${leadValue(lead.service_type)} - ${leadValue(lead.issue_type)}`.replace(/[\r\n]/g, ' '),
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <img src="https://www.roofingnearmestl.com/logo.png" alt="RoofingnearmeSTL" width="180" />
            <h2>New Roofing Lead</h2>
            <table style="width:100%;border-collapse:collapse">${fields.map(([label, value]) =>
              `<tr><th style="text-align:left;padding:8px 0">${escapeHtml(label)}:</th><td>${escapeHtml(value).replace(/\r?\n/g, '<br>')}</td></tr>`
            ).join('')}</table>
          </div>`,
          text: fields.map(([label, value]) => `${label}: ${value}`).join('\n'),
        })
        if (emailError) {
          console.error('RESEND EMAIL FAILED', { name: emailError.name })
        } else {
          console.log('LEAD EMAIL SENT', { id: emailData?.id })
        }
      }
    } catch (emailError) {
      console.error('RESEND EMAIL CRASH', { name: emailError instanceof Error ? emailError.name : 'UnknownError' })
    }
    // Optional text alert via Twilio; skipped until all four variables are set. Must not fail a saved lead.
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID
      const token = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_FROM_NUMBER
      const to = process.env.LEAD_ALERT_PHONE
      if (sid && token && from && to) {
        const text = `${lead.emergency === true ? 'EMERGENCY - ' : ''}New roofing lead: ${[
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
    // Optional: send the saved lead to the CRM. LEAD_WEBHOOK_URL is a Make.com custom webhook whose
    // scenario posts rooflink_job_json to RoofLink's "Create a new job" API (POST /light/public/jobs/).
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
              lead.emergency === true ? 'EMERGENCY - needs a tarp now' : '',
              service && `Service: ${service}`,
              leadValue(lead.issue_type) && `Issue: ${leadValue(lead.issue_type)}`,
              !leadValue(lead.address) && 'No street address given - call to confirm',
              leadValue(lead.roof_age) && `Age of roof: ${leadValue(lead.roof_age)}`,
              leadValue(lead.roof_size) && `Estimator: ${[leadValue(lead.roof_size), leadValue(lead.roof_pitch), leadValue(lead.roof_material)].filter(Boolean).join(', ')}`,
              estimate && `Estimate shown: ${Number(estimate).toLocaleString('en-US')}`,
              leadValue(lead.message) && `Message: ${leadValue(lead.message)}`,
              `Source: ${sourceLabel}`,
              leadValue(lead.page_url) && `Form page: ${leadValue(lead.page_url)}`,
            ].filter(Boolean).join('\n'),
          },
        }
        const res = await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
            rooflink_job_json: JSON.stringify(rooflinkJob),
          }),
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) console.error('LEAD WEBHOOK FAILED', { status: res.status })
      }
    } catch (hookError) {
      console.error('LEAD WEBHOOK CRASH', { name: hookError instanceof Error ? hookError.name : 'UnknownError' })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('LEAD API FAILED', { name: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: 'Unable to submit lead' }, { status: 500 })
  }
}
