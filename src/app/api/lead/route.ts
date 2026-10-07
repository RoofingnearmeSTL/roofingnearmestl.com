import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('NEW LEAD BODY', body)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Production')
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await supabase.from('leads').insert([{
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      source: 'website',
      status: 'new'
    }]).select()
    if (error) { console.error('SUPABASE ERROR', error); return NextResponse.json({ error: error.message }, { status: 500 }) }
    console.log('INSERT OK', data)
    return NextResponse.json({ ok: true, data })
  // Preserve the explicitly requested catch signature.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e:any) { console.error('CRASH', e); return NextResponse.json({ error: e.message }, { status: 500 }) }
}
