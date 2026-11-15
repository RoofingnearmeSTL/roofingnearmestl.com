import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { checkBotId } from 'botid/server'
import { PHONES } from '../../../lib/business'
import { buildEstimateUpdateEmail } from '../../../lib/customer-email'
import { ROUGH_ESTIMATE_HEADLINE, ROUGH_ESTIMATE_NOTICE, parseEstimateInputs, roughEstimate } from '../../../lib/estimate-offer'
import { createSendLimiter, openEstimateToken } from '../../../lib/estimate-token'

// /free-inspection after a saved Missouri roof replacement request:
// - send: false  checks the sealed token and returns the estimate for these inputs (restores the result after a refresh)
// - send: true   "Email My Updated Estimate": emails the recalculated estimate to the address saved with the request
// Never a lead, never an ad conversion. There is no way to give it an email address: it only reads the token.
export const runtime = 'nodejs'

const MAX_BODY_BYTES = 4_000
const limiter = createSendLimiter()

/** Same-site browsers only: a request whose Origin names another site is refused. */
function crossSite(req: Request): boolean {
  const origin = req.headers?.get('origin')
  const host = req.headers?.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host !== host
  } catch {
    return true
  }
}

export async function POST(req: Request) {
  try {
    if (Number(req.headers?.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    }
    if (crossSite(req)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    const body = await req.json().catch(() => null)
    const claims = openEstimateToken(body?.token, process.env)
    if (!claims) return NextResponse.json({ error: 'Your estimate session has ended. Call us for an updated estimate.' }, { status: 401 })
    const inputs = parseEstimateInputs(body?.inputs)
    const outcome = inputs ? roughEstimate(inputs) : null
    if (!inputs || !outcome || outcome.status !== 'ready') {
      return NextResponse.json({ error: 'Choose a roof size, a priced material and a pitch to get a number.' }, { status: 400 })
    }
    const estimate = outcome.estimate
    if (body?.send !== true) return NextResponse.json({ ok: true, estimate })

    // Bots never get our email; the check itself failing counts as "not a bot", like the lead form.
    try {
      const verdict = await checkBotId()
      if (verdict.isBot && !verdict.isVerifiedBot) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    } catch (botError) {
      console.error('BOTID CHECK FAILED', { name: botError instanceof Error ? botError.name : 'UnknownError' })
    }

    const inputsKey = `${inputs.size}-${inputs.material}-${inputs.pitch}`
    const check = limiter.check(claims.ref, inputsKey)
    if (check === 'duplicate') return NextResponse.json({ ok: true, estimate, email: 'duplicate' })
    if (check !== 'ok') {
      console.log('ESTIMATE EMAIL LIMITED', { result: check })
      return NextResponse.json({ ok: false, estimate, email: check }, { status: 429 })
    }
    if (!process.env.RESEND_API_KEY || !process.env.LEAD_TO_EMAIL) {
      console.error('RESEND CONFIGURATION MISSING: RESEND_API_KEY or LEAD_TO_EMAIL')
      return NextResponse.json({ ok: false, estimate, email: 'failed' }, { status: 502 })
    }
    const message = buildEstimateUpdateEmail({
      firstName: claims.firstName,
      estimate: { headline: ROUGH_ESTIMATE_HEADLINE, notice: ROUGH_ESTIMATE_NOTICE, ...estimate },
      moPhone: PHONES.MO.display,
      ilPhone: PHONES.IL.display,
    })
    const resend = new Resend(process.env.RESEND_API_KEY)
    // The idempotency key stops the same estimate going out twice, even from another server copy.
    const { data, error } = await resend.emails.send({
      from: 'RoofingnearmeSTL <leads@roofingnearmestl.com>',
      to: claims.email,
      replyTo: process.env.LEAD_TO_EMAIL,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }, { idempotencyKey: `estimate-update/${claims.ref}/${inputsKey}` })
    if (error) {
      console.error('ESTIMATE EMAIL FAILED', { name: error.name })
      return NextResponse.json({ ok: false, estimate, email: 'failed' }, { status: 502 })
    }
    limiter.record(claims.ref, inputsKey)
    console.log('ESTIMATE EMAIL SENT', { id: data?.id })
    return NextResponse.json({ ok: true, estimate, email: 'sent' })
  } catch (error) {
    console.error('ESTIMATE EMAIL CRASH', { name: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ error: 'Unable to email the estimate' }, { status: 500 })
  }
}
