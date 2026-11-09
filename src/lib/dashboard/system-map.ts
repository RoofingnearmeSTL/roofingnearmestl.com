// The platforms and how they connect. No imports. No account IDs or keys.
export type NodeStatus = 'connected' | 'built_off' | 'not_set_up'
export type MapNode = { id: string; label: string; status: NodeStatus; statusLabel: string; detail: string; source: string }
export type MapEdge = { from: string; to: string; label: string }
type Health = { id: string; ok: boolean; missing: string[] }

export const STATUS_LABEL: Record<NodeStatus, string> = {
  connected: 'Connected (settings present)',
  built_off: 'Built, off',
  not_set_up: 'Not set up',
}

export function systemMap(input: {
  health: Health[]
  dataStore: 'ok' | 'not_set_up' | 'error'
  lastBrainSync: { ok: boolean | null; at: string | null } | null
}): { nodes: MapNode[]; edges: MapEdge[] } {
  const h = (id: string) => input.health.find((x) => x.id === id) ?? { id, ok: false, missing: [] }
  const mk = (id: string, label: string, status: NodeStatus, detail: string, source: string): MapNode => ({ id, label, status, statusLabel: STATUS_LABEL[status], detail, source })
  const crm = h('crm').ok
  const ga4 = h('ga4').ok
  const brainToken = !h('brain_copy').missing.some((m) => m.startsWith('BRAIN_GITHUB_TOKEN'))
  const cronSecret = !h('lead_check').missing.includes('CRON_SECRET')
  const sync = input.lastBrainSync

  const nodes: MapNode[] = [
    mk('website', 'Website (Vercel)', 'connected', 'roofingnearmestl.com', 'this page'),
    mk('supabase', 'Supabase', h('supabase').ok ? 'connected' : 'not_set_up',
      `Leads table; data store tables ${input.dataStore === 'ok' ? 'ready' : 'not set up: run the migration'}`, 'setting check on this page'),
    mk('resend', 'Resend (email)', h('team_email').ok ? 'connected' : 'not_set_up', 'Team email and customer follow-up', 'setting check on this page'),
    mk('n8n', 'n8n', crm ? 'connected' : 'built_off', 'bridge built in Brain-Data integrations/n8n (checked 2026-11-09)', 'setting check on this page and Brain-Data notes'),
    mk('rooflink', 'RoofLink', crm ? 'connected' : 'built_off',
      crm ? 'jobs created through n8n; RoofLink API answered 429 in Oct, creation not yet confirmed (Brain-Data docs/platforms.md, 2026-11-09)' : 'waits for the CRM hand-off to be switched on',
      'setting check on this page and Brain-Data docs/platforms.md'),
    mk('twilio', 'Twilio (texts)', h('texts').ok ? 'connected' : 'built_off', 'Text alert for each new lead', 'setting check on this page'),
    mk('google', 'Google (Ads, GA4)', 'connected', `Ads tag on every page (campaign paused until ads start); GA4: ${ga4 ? 'on' : 'off'}`, 'website code'),
    mk('meta', 'Meta (Facebook, Instagram)', 'connected', 'Pixel on every page (src/lib/tracking.ts)', 'website code'),
    mk('vercel_cron', 'Vercel Cron', cronSecret ? 'connected' : 'not_set_up', 'Daily lead check and daily Brain copy', 'setting check on this page'),
    mk('github_brain', 'GitHub (Brain-Data)', !brainToken ? 'not_set_up' : sync && sync.ok === true ? 'connected' : 'built_off',
      !brainToken ? 'read-only token not added yet' : sync && sync.ok === false ? 'last copy failed' : sync && sync.ok === true ? 'last copy worked' : 'token present, no copy yet',
      'setting check and last copy record'),
  ]
  const edges: MapEdge[] = [
    { from: 'website', to: 'supabase', label: 'saves leads' },
    { from: 'website', to: 'resend', label: 'emails team + customer' },
    { from: 'website', to: 'n8n', label: 'sends lead' },
    { from: 'n8n', to: 'rooflink', label: 'creates job' },
    { from: 'website', to: 'twilio', label: 'text alert' },
    { from: 'google', to: 'website', label: 'ads + analytics' },
    { from: 'meta', to: 'website', label: 'ads + pixel' },
    { from: 'vercel_cron', to: 'website', label: 'daily checks' },
    { from: 'github_brain', to: 'supabase', label: 'daily notes copy' },
    { from: 'supabase', to: 'website', label: 'dashboard reads' },
  ]
  return { nodes, edges }
}
