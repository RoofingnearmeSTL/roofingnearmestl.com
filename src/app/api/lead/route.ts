import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

function leadValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body || typeof body.name !== 'string' || !body.name.trim() ||
        typeof body.phone !== 'string' || !body.phone.trim()) {
      return NextResponse.json({ error: 'name and phone required' }, { status: 400 })
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Production')
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const lead = {
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      service_type: body.service_type ?? body.service ?? null,
      issue_type: body.issue_type ?? null,
      roof_age: body.roof_age ?? null,
      roof_size: body.roof_size ?? body.est_size ?? null,
      roof_pitch: body.roof_pitch ?? body.est_pitch ?? null,
      roof_material: body.roof_material ?? body.est_material ?? null,
      emergency: body.emergency === true,
      message: body.message ?? body.details ?? null,
    }
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
        ]
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Roofing Near Me STL <leads@roofingnearmestl.com>',
          to: process.env.LEAD_TO_EMAIL,
          ...(typeof body.email === 'string' && body.email.trim()
            ? { replyTo: body.email.trim() }
            : {}),
          subject: `New Roofing Lead: ${leadValue(lead.city)} - ${leadValue(lead.service_type)} - ${leadValue(lead.issue_type)}`.replace(/[\r\n]/g, ' '),
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <img src="https://www.roofingnearmestl.com/logo.png" alt="Roofing Near Me STL" width="180" />
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
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('LEAD API FAILED', { name: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: 'Unable to submit lead' }, { status: 500 })
  }
}
