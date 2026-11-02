import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Daily saved-vs-sent check (Phase 1). Vercel Cron calls this once a day (vercel.json) with
// "Authorization: Bearer <CRON_SECRET>". It counts the leads saved in Supabase in the last 24 hours and the
// team lead emails Resend delivered in the same window. If any saved lead has no delivered team email, it
// emails Mike a short alert so no lead is ever silently lost. It changes no data and sends nothing to customers.
// Off until CRON_SECRET is set in Vercel (answers 503 without it, so it cannot be triggered by strangers).
//
// Two Resend keys, so the lead form never holds a powerful one:
// - RESEND_API_KEY: "Sending access" key. Sends the alert (and every lead email in /api/lead).
// - RESEND_LEAD_CHECK_KEY: "Full access" key, read only here, to list sent emails. Resend has no read-only key
//   type, and a sending-access key gets `restricted_api_key` when it tries to list (Oct 30-31, 2026).
// If the check itself can't run, it emails Mike that it failed instead of failing silently.

const WINDOW_MS = 24 * 60 * 60 * 1000
const DELIVERED = new Set(['sent', 'delivered', 'opened', 'clicked', 'delivery_delayed'])
const FROM = 'RoofingnearmeSTL <leads@roofingnearmestl.com>'

// Only these fixed messages ever reach a log or an email; raw SDK errors could carry request details.
class CheckError extends Error {}
const code = (value: unknown) => (typeof value === 'string' && /^[A-Za-z0-9_]{1,60}$/.test(value) ? value : 'unknown')

function fixHint(message: string) {
  if (/restricted_api_key/.test(message)) {
    return 'Fix: in Resend, create an API key with "Full access" and save it in Vercel as RESEND_LEAD_CHECK_KEY (Production), then redeploy. Keep RESEND_API_KEY as the sending-access key.'
  }
  if (/Missing/.test(message)) return 'Fix: a Vercel setting the check needs is missing (see the message above).'
  return 'Fix: check the Vercel runtime log for /api/lead-check.'
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'lead check not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, RESEND_API_KEY: resendKey, RESEND_LEAD_CHECK_KEY: listKey, LEAD_TO_EMAIL: owner } = process.env
  try {
    if (!url || !key || !resendKey || !owner) throw new CheckError('Missing Supabase or Resend settings')
    const since = new Date(Date.now() - WINDOW_MS)

    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('created_at, status, city, service_type')
      .gte('created_at', since.toISOString())
      .neq('status', 'test')
      .order('created_at', { ascending: true })
    if (leadError) throw new CheckError(`Supabase read failed: ${code(leadError.code)}`)
    const saved = leads ?? []

    // Team lead emails in the window (newest first; 100 per page is far above a day's leads).
    const resend = new Resend(resendKey)
    const reader = listKey ? new Resend(listKey) : resend
    const { data: list, error: listError } = await reader.emails.list({ limit: 100 })
    if (listError) throw new CheckError(`Resend list failed: ${code(listError.name)}`)
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
      from: FROM,
      to: owner,
      subject: `LEAD CHECK: ${missing || failed} lead email(s) need a look`,
      text: lines.join('\n'),
    })
    if (alertError) console.error('LEAD CHECK ALERT FAILED', { name: alertError.name })
    return NextResponse.json({ ok: false, alerted: !alertError, ...summary })
  } catch (error) {
    const message = error instanceof CheckError ? error.message : `Unexpected error (${code((error as { name?: unknown } | null)?.name)})`
    console.error('LEAD CHECK FAILED', { message })
    // Best effort: tell Mike the safety net didn't run. Never throws; the 500 below is what Vercel records.
    let alerted = false
    if (resendKey && owner) {
      try {
        const { error: alertError } = await new Resend(resendKey).emails.send({
          from: FROM,
          to: owner,
          subject: 'LEAD CHECK FAILED: the daily lead check could not run',
          text: [
            `The daily check that compares saved leads with delivered lead emails could not run: ${message}`,
            '',
            fixHint(message),
            '',
            'The lead form sends its own emails, but this check could not confirm any were saved or delivered today. Look at the Supabase "leads" table and your inbox until the check runs again.',
            'Sent by the daily lead check at roofingnearmestl.com/api/lead-check.',
          ].join('\n'),
        })
        alerted = !alertError
        if (alertError) console.error('LEAD CHECK ALERT FAILED', { name: alertError.name })
      } catch {
        console.error('LEAD CHECK ALERT FAILED', { name: 'SendThrew' })
      }
    }
    return NextResponse.json({ error: 'lead check failed', alerted }, { status: 500 })
  }
}
