import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { serverSupabase } from '@/lib/data-store/server-client'
import { checkN8nUsage } from '@/lib/n8n/check'
import { alertDecision, alertText } from '@/lib/n8n/usage'

// Daily n8n usage check. Vercel Cron calls this once a day (vercel.json) with "Authorization: Bearer <CRON_SECRET>".
// It counts the n8n runs used this billing cycle (the n8n API, read-only N8N_API_KEY) and emails Mike
// (LEAD_TO_EMAIL, via RESEND_API_KEY) only when usage passes 75%, 90% or 100% of N8N_MONTHLY_EXECUTION_LIMIT since
// the last check, or when the pace newly points past the limit. Quiet days send nothing.
// Off until CRON_SECRET is set (503), and "not set up" until the n8n settings are added. It never changes n8n and
// sends nothing to customers. Responses and logs hold fixed messages only, never the key or response bodies.
export const runtime = 'nodejs'
export const maxDuration = 60

const FROM = 'RoofingnearmeSTL <leads@roofingnearmestl.com>'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'n8n usage check not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const trigger = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron') ? 'cron' : 'manual'
  try {
    const check = await checkN8nUsage({ env: process.env, db: serverSupabase(process.env), save: true, trigger })
    if (check.state === 'not_set_up') return NextResponse.json({ ok: false, setup: 'n8n_missing', missing: check.missing }, { status: 503 })
    if (check.state === 'error') {
      console.error('N8N USAGE CHECK FAILED', { message: check.message })
      return NextResponse.json({ ok: false, error: check.message }, { status: 500 })
    }

    const u = check.usage
    // Without saved counts, "before" is estimated as the total minus the last 24 hours (the check runs daily).
    const before = check.usedBefore ?? Math.max(u.used - check.last24h, 0)
    const decision = alertDecision({ before, after: u, projectedBefore: check.projectedBefore })
    const summary = { used: u.used, limit: u.limit, percent: u.percent, projected: u.projected, cycleEnd: u.cycle.end, stored: check.stored }

    if (!decision.send) {
      console.log('N8N USAGE OK', summary)
      return NextResponse.json({ ok: true, alerted: false, ...summary })
    }

    const { RESEND_API_KEY: resendKey, LEAD_TO_EMAIL: owner } = process.env
    if (!resendKey || !owner) {
      console.error('N8N USAGE ALERT NOT SENT', { reason: 'Missing RESEND_API_KEY or LEAD_TO_EMAIL', ...summary })
      return NextResponse.json({ ok: true, alerted: false, reason: 'email settings missing', ...summary })
    }
    const { error } = await new Resend(resendKey).emails.send({ from: FROM, to: owner, subject: decision.subject, text: alertText(u, decision.reasons) })
    if (error) console.error('N8N USAGE ALERT FAILED', { name: error.name })
    else console.log('N8N USAGE ALERT SENT', summary)
    return NextResponse.json({ ok: true, alerted: !error, ...summary })
  } catch {
    console.error('N8N USAGE CHECK FAILED', { message: 'Unexpected error' })
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 })
  }
}
