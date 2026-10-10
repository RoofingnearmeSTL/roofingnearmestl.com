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
    console.log('NEW LEAD BODY', body)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Production')
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await supabase.from('leads').insert([{
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      source: 'website',
      status: 'new'
    }]).select()
    if (error) { console.error('SUPABASE ERROR', error); return NextResponse.json({ error: error.message }, { status: 500 }) }
    console.log('INSERT OK', data)
    // A notification failure must not fail an already-saved lead.
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('RESEND CONFIGURATION MISSING: RESEND_API_KEY')
      } else {
        const lead = {
          name: leadValue(body.name),
          phone: leadValue(body.phone),
          email: leadValue(body.email),
          address: leadValue(body.address),
          message: leadValue(body.details || body.message),
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
          to: 'michael@roofingnearmestl.com',
          ...(typeof body.email === 'string' && body.email.trim()
            ? { replyTo: body.email.trim() }
            : {}),
          subject: 'New website roofing lead',
          html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
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
          console.error('RESEND EMAIL FAILED', JSON.stringify(emailError, null, 2))
        } else {
          console.log('LEAD EMAIL SENT', emailData)
        }
      }
    } catch (emailError) {
      console.error('RESEND EMAIL CRASH', emailError)
    }
    return NextResponse.json({ ok: true, data })
  // Preserve the explicitly requested catch signature.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e:any) { console.error('CRASH', e); return NextResponse.json({ error: e.message }, { status: 500 }) }
}
