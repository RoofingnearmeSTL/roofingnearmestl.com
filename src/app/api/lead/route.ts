import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('NEW LEAD BODY', body)

    if (!body.name || !body.phone) {
      return NextResponse.json({ error: 'name and phone required' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('MISSING ENV VARS', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      })
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name: body.name,
          phone: body.phone,
          email: body.email || null,
          address: body.address || null,
          city: body.city || null,
          source: 'website',
          status: 'new',
        },
      ])
      .select()

    if (error) {
      console.error('SUPABASE INSERT FAILED', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('SUPABASE INSERT OK', data)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error('LEAD API CRASH', e)
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}