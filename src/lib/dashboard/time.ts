// Time helpers for the dashboard. No imports.
const TZ = 'America/Chicago'

export function startOfDayChicago(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const offset = asUtc - Math.floor(now.getTime() / 1000) * 1000
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')) - offset)
}

export function formatCentral(d: Date | string | null | undefined): string {
  if (!d) return 'never'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return 'never'
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date)
  return `${s} CT`
}

export function timeAgo(d: Date | string | null | undefined, now: Date): string {
  if (!d) return 'never'
  const date = typeof d === 'string' ? new Date(d) : d
  const ms = now.getTime() - date.getTime()
  if (Number.isNaN(ms)) return 'never'
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const days = Math.floor(h / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
