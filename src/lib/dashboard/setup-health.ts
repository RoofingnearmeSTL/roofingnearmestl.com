// Setup checks for the lead path and the data store. Reports setting NAMES and yes/no only, never values.
import { introVideoUrl } from '../customer-email'

export type HealthItem = { id: string; label: string; ok: boolean; missing: string[]; help: string }
type Env = Record<string, string | undefined>

const has = (env: Env, name: string) => typeof env[name] === 'string' && env[name]!.trim().length > 0

function required(env: Env, id: string, label: string, names: string[], help: string): HealthItem {
  const missing = names.filter((n) => !has(env, n))
  return { id, label, ok: missing.length === 0, missing, help }
}

export function setupHealth(env: Env): HealthItem[] {
  const video: HealthItem = has(env, 'INTRO_VIDEO_URL')
    ? (introVideoUrl(env.INTRO_VIDEO_URL)
      ? { id: 'video', label: 'Intro video', ok: true, missing: [], help: 'Follow-up email and thank-you page link' }
      : { id: 'video', label: 'Intro video', ok: false, missing: ['INTRO_VIDEO_URL (must be an https link)'], help: 'Follow-up email and thank-you page link' })
    : { id: 'video', label: 'Intro video', ok: false, missing: ['INTRO_VIDEO_URL'], help: 'Follow-up email and thank-you page link' }
  const ga4 = /^G-[A-Z0-9]+$/.test((env.NEXT_PUBLIC_GA4_ID ?? '').trim())
  return [
    required(env, 'supabase', 'Saving leads (Supabase)', ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], 'Every lead is saved here first'),
    required(env, 'team_email', 'Team email (Resend)', ['RESEND_API_KEY', 'LEAD_TO_EMAIL'], 'Emails the team each new lead'),
    required(env, 'lead_check', 'Daily lead check', ['RESEND_LEAD_CHECK_KEY', 'CRON_SECRET'], 'Morning check that leads and emails are flowing'),
    required(env, 'crm', 'CRM hand-off (n8n to RoofLink)', ['LEAD_WEBHOOK_URL', 'LEAD_WEBHOOK_SECRET'], 'Sends each lead on to the CRM'),
    required(env, 'texts', 'Text alerts (Twilio)', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'LEAD_ALERT_PHONE'], 'Texts the team each new lead'),
    video,
    required(env, 'brain_copy', 'Daily Brain copy', ['BRAIN_GITHUB_TOKEN', 'CRON_SECRET'], 'Copies the Brain notes into the data store each morning'),
    { id: 'ga4', label: 'Google Analytics 4', ok: ga4, missing: ga4 ? [] : ['NEXT_PUBLIC_GA4_ID'], help: 'Website visit numbers' },
  ]
}
