import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Daily saved-vs-sent check (Phase 1). Vercel Cron calls this once a day (vercel.json) with
// "Authorization: Bearer <CRON_SECRET>". It counts the leads saved in Supabase in the last 24 hours and the
// team lead emails Resend delivered in the same window. If any saved lead has no delivered team email, it
// emails Mike a short alert so no lead is ever silently lost. It changes no data and sends nothing to customers.
// Off until CRON_SECRET is set in Vercel (answers 503 without it, so it cannot be triggered by strangers).

const WINDOW_MS = 24 * 60 * 60 * 1000
const DELIVERED = new Set(['sent', 'delivered', 'opened', 'clicked', 'delivery_delayed'])

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'lead check not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, RESEND_API_KEY: resendKey, LEAD_TO_EMAIL: owner } = process.env
    if (!url || !key || !resendKey || !owner) throw new Error('Missing Supabase or Resend settings')
    const since = new Date(Date.now() - WINDOW_MS)

    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('created_at, status, city, service_type')
      .gte('created_at', since.toISOString())
      .neq('status', 'test')
      .order('created_at', { ascending: true })
    if (leadError) throw new Error(`Supabase read failed: ${leadError.code}`)
    const saved = leads ?? []

    // Team lead emails in the window (newest first; 100 per page is far above a day's leads).
    const resend = new Resend(resendKey)
    const { data: list, error: listError } = await resend.emails.list({ limit: 100 })
    if (listError) throw new Error(`Resend list failed: ${listError.name}`)
    const teamEmails = (list?.data ?? []).filter((email) =>
      Date.parse(email.created_at) >= since.getTime() &&
      email.to.some((to) => to.toLowerCase() === owner.toLowerCase()) &&
      /New Roofing Lead/.test(email.subject))
    const delivered = teamEmails.filter((email) => DELIVERED.has(email.last_event)).length
    const failed = teamEmails.filter((email) => !DELIVERED.has(email.last_event) && email.last_event !== 'queued' && email.last_event !== 'scheduled').length

    const missing = Math.max(0, saved.length - delivered)
    const summary = { saved: saved.length, delivered, failed, missing, since: since.toISOString() }
    if (missing === 0 && failed === 0) {
      console.log('LEAD CHECK OK', summary)
      return NextResponse.json({ ok: true, ...summary })
    }

    console.error('LEAD CHECK MISMATCH', summary)
    const lines = [
      `Lead check for the last 24 hours: ${saved.length} lead(s) saved, ${delivered} team email(s) delivered${failed ? `, ${failed} failed or bounced` : ''}.`,
      missing ? `${missing} saved lead(s) may not have reached your inbox. Open the Supabase "leads" table and call them.` : 'Some team emails failed or bounced. Check the Resend dashboard.',
      '',
      'Leads saved in the window (time UTC, status, city, service):',
      ...saved.map((lead) => `- ${lead.created_at} | ${lead.status ?? 'new'} | ${lead.city ?? '-'} | ${lead.service_type ?? '-'}`),
      '',
      'Sent by the daily lead check at roofingnearmestl.com/api/lead-check.',
    ]
    const { error: alertError } = await resend.emails.send({
      from: 'RoofingnearmeSTL <leads@roofingnearmestl.com>',
      to: owner,
      subject: `LEAD CHECK: ${missing || failed} lead email(s) need a look`,
      text: lines.join('\n'),
    })
    if (alertError) console.error('LEAD CHECK ALERT FAILED', { name: alertError.name })
    return NextResponse.json({ ok: false, alerted: !alertError, ...summary })
  } catch (error) {
    console.error('LEAD CHECK FAILED', { message: error instanceof Error ? error.message : 'UnknownError' })
    return NextResponse.json({ error: 'lead check failed' }, { status: 500 })
  }
}
