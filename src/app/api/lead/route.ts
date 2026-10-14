import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

function leadValue(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Not provided'
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
    const { error } = await supabase.from('leads').insert([{
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
      emergency: body.emergency ?? false,
      message: body.message ?? body.details ?? null,
    }])
    if (error) {
      console.error('SUPABASE INSERT FAILED', { code: error.code })
      return NextResponse.json({ error: 'Unable to save lead' }, { status: 500 })
    }
    // A notification failure must not fail an already-saved lead.
    try {
      if (!process.env.RESEND_API_KEY || !process.env.LEAD_TO_EMAIL) {
        console.error('RESEND CONFIGURATION MISSING: RESEND_API_KEY or LEAD_TO_EMAIL')
      } else {
        const lead = {
          name: leadValue(body.name),
          phone: leadValue(body.phone),
          email: leadValue(body.email),
          address: leadValue(body.address),
          message: leadValue(body.message ?? body.details),
        }
        const name = escapeHtml(lead.name)
        const phone = escapeHtml(lead.phone)
        const email = escapeHtml(lead.email)
        const address = escapeHtml(lead.address)
        const message = escapeHtml(lead.message).replace(/\r?\n/g, '<br>')
        const phoneHref = escapeHtml(lead.phone.replace(/[^+0-9]/g, ''))
        const emailHref = escapeHtml(encodeURIComponent(lead.email))
        const timestamp = new Date().toLocaleString()
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Roofing Near Me STL <leads@roofingnearmestl.com>',
          to: process.env.LEAD_TO_EMAIL,
          ...(typeof body.email === 'string' && body.email.trim()
            ? { replyTo: body.email.trim() }
            : {}),
          subject: 'New website roofing lead',
          html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
  <img src="https://www.roofingnearmestl.com/logo.png" alt="Roofing Near Me STL" width="180" style="margin-bottom:16px" />
  <h2 style="margin:0 0 16px">🏠 New Roofing Lead</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px 0;font-weight:bold">Name:</td><td>${name}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold">Phone:</td><td>${lead.phone === 'Not provided' ? phone : `<a href="tel:${phoneHref}">${phone}</a>`}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold">Email:</td><td>${lead.email === 'Not provided' ? email : `<a href="mailto:${emailHref}">${email}</a>`}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold">Address:</td><td>${address}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold">Message:</td><td>${message}</td></tr>
  </table>
  <p style="margin-top:20px;font-size:12px;color:#6b7280">From roofingnearmestl.com - ${escapeHtml(timestamp)}</p>
</div>`,
          text: [
            '🏠 New Roofing Lead',
            `Name: ${lead.name}`,
            `Phone: ${lead.phone}`,
            `Email: ${lead.email}`,
            `Address: ${lead.address}`,
            `Message: ${lead.message}`,
            '',
            `From roofingnearmestl.com - ${timestamp}`,
          ].join('\n'),
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
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('LEAD API FAILED', { name: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: 'Unable to submit lead' }, { status: 500 })
  }
}
