import { NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/data-store/server-client'
import { createSupabaseBrainStore } from '@/lib/data-store/brain-store'
import { runBrainSync } from '@/lib/brain/sync'

// Daily copy of the Brain-Data notes into Supabase (DATA-04). Vercel Cron calls this once a day (vercel.json) with
// "Authorization: Bearer <CRON_SECRET>"; it can also be called by hand with the same header. GitHub stays the source of
// truth: this only reads the repo (read-only BRAIN_GITHUB_TOKEN) and refreshes a copy for the dashboard. Same auth as
// /api/lead-check. Responses and logs hold fixed messages only: never note text, the token or raw errors.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'brain sync not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const client = serverSupabase(process.env)
    if (!client) return NextResponse.json({ ok: false, setup: 'supabase_missing' }, { status: 503 })

    const url = new URL(req.url)
    const trigger = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron') ? 'cron' : 'manual'
    const result = await runBrainSync({
      env: process.env,
      fetch: globalThis.fetch,
      store: createSupabaseBrainStore(client),
      trigger,
      full: url.searchParams.get('full') === '1',
      allowLargeDelete: url.searchParams.get('allow_large_delete') === '1',
    })

    if (result.ok) {
      console.log('BRAIN SYNC OK', { counts: result.counts, partial: result.partial })
      return NextResponse.json({ ok: true, partial: !!result.partial, commit: result.commit, counts: result.counts, skipped: result.skipped ?? 0 })
    }
    if (result.setup === 'tables_missing') {
      return NextResponse.json(
        { ok: false, setup: 'tables_missing', hint: 'Run supabase/migrations/20261109120000_data_store_dashboard_v1.sql in the Supabase SQL Editor' },
        { status: 503 },
      )
    }
    if (result.setup === 'token_missing' || result.setup === 'repo_invalid') {
      return NextResponse.json({ ok: false, setup: result.setup }, { status: 503 })
    }
    console.error('BRAIN SYNC FAILED', { error: result.error })
    return NextResponse.json({ ok: false, error: result.error ?? 'Unexpected error' }, { status: 500 })
  } catch {
    console.error('BRAIN SYNC FAILED', { error: 'Unexpected error' })
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 })
  }
}
