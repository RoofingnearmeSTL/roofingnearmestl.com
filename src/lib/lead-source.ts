// Plain-words "Source" line for the team email, the CRM note and the webhook (Mike, Nov 18 2026).
// It says how the visitor reached the site: an ad click ID first, then the site that sent them, then "Direct".
// Campaign tags (utm_*) are added in brackets when present. Server-side only; it never changes what is saved.

export type LeadSourceInput = {
  utm_source?: unknown
  utm_medium?: unknown
  utm_campaign?: unknown
  gclid?: unknown
  gbraid?: unknown
  wbraid?: unknown
  fbclid?: unknown
  referrer?: unknown
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** The visitor's referring host without "www." (lower case), or "" when it isn't a web address. */
function referrerHost(referrer: string): string {
  try {
    const url = new URL(referrer)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return url.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

const isSite = (host: string, name: string) => host === name || host.endsWith(`.${name}`)

/** Names the site that sent the visitor when there was no ad click ID. */
function fromReferrer(host: string): string {
  // google.com, google.co.uk, maps.google.com ... (search results, Maps and the Google business listing all look alike).
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'Google search, Maps or business listing (no ad click ID)'
  if (isSite(host, 'facebook.com') || isSite(host, 'fb.com') || isSite(host, 'messenger.com')) return 'Facebook (no click ID)'
  if (isSite(host, 'instagram.com')) return 'Instagram (no click ID)'
  if (isSite(host, 'bing.com')) return 'Bing search'
  if (isSite(host, 'yahoo.com')) return 'Yahoo search'
  if (isSite(host, 'duckduckgo.com')) return 'DuckDuckGo search'
  if (isSite(host, 'nextdoor.com')) return 'Nextdoor'
  if (isSite(host, 'yelp.com')) return 'Yelp'
  return `Other website: ${host.slice(0, 100)}`
}

export function leadSourceLabel(lead: LeadSourceInput): string {
  const tags = [text(lead.utm_source), text(lead.utm_medium), text(lead.utm_campaign)].filter(Boolean).join(' / ')
  const host = referrerHost(text(lead.referrer))
  const where = text(lead.gclid) || text(lead.gbraid) || text(lead.wbraid)
    ? 'Google Ads click'
    : text(lead.fbclid)
      ? 'Facebook / Instagram click'
      : host
        ? fromReferrer(host)
        : tags
          ? 'Tagged link'
          : 'Direct (typed in, bookmark or app; no click ID)'
  return tags ? `${where} (tags: ${tags})` : where
}
