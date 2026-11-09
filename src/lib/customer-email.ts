// Customer follow-up email (FUP-01): the one email the website sends a homeowner; RoofLink sends none.
// Phone numbers are passed in from src/lib/business.ts. No imports and no environment access here, so tests can load it directly.

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

/** The intro video link, or null. Only a plain https link (500 characters or fewer) is accepted. */
export function introVideoUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const url = raw.trim()
  if (url.length > 500) return null
  return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#][^\s"'<>\\]*)?$/i.test(url) ? url : null
}

export const CUSTOMER_EMAIL_SUBJECT = 'We got your request - RoofingnearmeSTL'

export type CustomerEmailInput = {
  firstName: string
  service: string
  place: string
  customerPhone: string
  illinois: boolean
  ilLicensePending: boolean
  emergencyTarp: boolean
  leadEmergency: boolean
  urgentExterior: boolean
  roofing: boolean
  videoUrl: string | null
  phones: { IL: string; MO: string }
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; heading: string; items: string[] }
  | { kind: 'video'; url: string }

const DECISION_MAKER = 'If you can, have whoever makes decisions about the home there, so you can go over what we find together.'
const PHOTOS_AS_WE_GO = 'We take photos as we go and walk you through what we find before you decide anything.'

export function buildCustomerEmail(input: CustomerEmailInput): { subject: string; text: string; html: string } {
  const { illinois, ilLicensePending, phones } = input
  // Defense in depth: an Illinois email never gets roof-report wording.
  const roofReport = input.roofing && !illinois && !ilLicensePending
  const phone = illinois ? phones.IL : phones.MO
  const received = `Thanks for contacting RoofingnearmeSTL. We received your request${input.service ? ` for ${input.service}` : ''}${input.place ? ` in ${input.place}` : ''}.`
  const timing = 'What happens next: during business hours, we call as soon as your request comes in.'

  let nextSteps: string
  if (ilLicensePending) {
    nextSteps = input.emergencyTarp
      ? `We're local and we'll call you at ${input.customerPhone} as soon as we can. If water is coming in, call us at ${phones.IL} and we'll point you to a licensed Illinois roofer right away.`
      : `${timing} Someone from our local team will call you at ${input.customerPhone}. If your roof needs work now, we'll point you to a licensed Illinois roofer, and we can help right away with siding, gutters, soffit, fascia and other exterior work.`
  } else {
    const visit = roofReport ? 'your free inspection' : 'a free siding, gutter or soffit & fascia estimate'
    nextSteps = `${timing} Someone from our local team will call you at ${input.customerPhone} to set up ${visit}.`
  }

  let phoneLine: string | null
  if (ilLicensePending) phoneLine = input.emergencyTarp ? null : `Need us sooner? Call ${phones.IL}.`
  else if (input.leadEmergency && !illinois) phoneLine = `If water is coming in right now, call our 24/7 emergency line: ${phones.MO}.`
  else if (input.urgentExterior) phoneLine = `You marked this as urgent storm damage, so we'll call you back as fast as we can. Need us sooner? Call ${phone}.`
  else phoneLine = `Need us sooner? Call ${phone}.`

  const visitList: Block = ilLicensePending
    ? { kind: 'list', heading: 'If we come out for siding, gutter, soffit or fascia work:', items: [DECISION_MAKER, PHOTOS_AS_WE_GO] }
    : roofReport
      ? { kind: 'list', heading: 'At your free inspection:', items: [DECISION_MAKER, `${PHOTOS_AS_WE_GO} You also get your Free Photo-Documented Roof Report.`] }
      : { kind: 'list', heading: 'At your free estimate:', items: [DECISION_MAKER, PHOTOS_AS_WE_GO] }

  const topic = ilLicensePending ? 'home' : roofReport ? 'roof' : 'project'
  const blocks: Block[] = [
    { kind: 'p', text: `Hi ${input.firstName},` },
    { kind: 'p', text: received },
    { kind: 'p', text: nextSteps },
    ...(phoneLine ? [{ kind: 'p', text: phoneLine } as Block] : []),
    ...(input.videoUrl ? [{ kind: 'video', url: input.videoUrl } as Block] : []),
    visitList,
    {
      kind: 'list',
      heading: "Help us get ready (only if it's easy). Reply to this email with:",
      items: [
        'Photos of the problem area',
        'The best times to reach you',
        'Anything we should know before we arrive, like a gate code, pets or how to get to the back of the house',
      ],
    },
    { kind: 'p', text: `Questions about your ${topic}? Just reply to this email.` },
    { kind: 'p', text: 'Thank you,\nRoofingnearmeSTL (Roofing Near Me STL LLC)' },
  ]

  // Illinois license note: small print, like a disclaimer (Mike, Oct 29).
  const licenseNote = ilLicensePending
    ? "Roofing in Illinois is pending our Illinois roofing license, which we expect soon. Until then we don't quote, schedule or do roof work on Illinois homes. We've saved your request and will reach out when roofing opens for Illinois."
    : ''
  const footer = `RoofingnearmeSTL · 421 Janice Dr, Waterloo, IL 62298 · Illinois ${phones.IL} · Missouri ${phones.MO} · roofingnearmestl.com\n` +
    "You're getting this one email because you asked for an estimate at roofingnearmestl.com. If that wasn't you, reply and let us know."

  const VIDEO_INTRO = 'Meet Mike, the owner, in a short hello video:'
  const blockText = (b: Block) => b.kind === 'p' ? b.text
    : b.kind === 'list' ? `${b.heading}\n${b.items.map((i) => `- ${i}`).join('\n')}`
    : `${VIDEO_INTRO}\n${b.url}`
  const text = [...blocks.map(blockText), ...(licenseNote ? [licenseNote] : []), '', footer].join('\n\n')

  const pStyle = 'font-size:16px;line-height:1.5'
  const blockHtml = (b: Block) => {
    if (b.kind === 'p') return `<p style="${pStyle}">${escapeHtml(b.text).replace(/\n/g, '<br>')}</p>`
    if (b.kind === 'list') {
      return `<p style="${pStyle};margin-bottom:4px"><strong>${escapeHtml(b.heading)}</strong></p>` +
        `<ul style="${pStyle};margin-top:0">${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
    }
    const url = escapeHtml(b.url)
    return `<p style="${pStyle}">${escapeHtml(VIDEO_INTRO)}</p>` +
      `<p><a href="${url}" style="display:inline-block;background:#0B6E99;color:#ffffff;padding:12px 22px;border-radius:999px;font-weight:bold;text-decoration:none">${escapeHtml("Watch Mike's hello")}</a></p>` +
      `<p style="font-size:13px;color:#444;line-height:1.5">${escapeHtml("If the button doesn't work, copy this link:")} ${url}</p>`
  }
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111">
            <img src="https://www.roofingnearmestl.com/logo.png" alt="RoofingnearmeSTL" width="180" />
            ${blocks.map(blockHtml).join('')}
            ${licenseNote ? `<p style="font-size:12px;color:#666;line-height:1.5">${escapeHtml(licenseNote)}</p>` : ''}
            <p style="font-size:12px;color:#666;line-height:1.5;border-top:1px solid #ddd;padding-top:12px">${escapeHtml(footer).replace(/\n/g, '<br>')}</p>
          </div>`

  return { subject: CUSTOMER_EMAIL_SUBJECT, text, html }
}
