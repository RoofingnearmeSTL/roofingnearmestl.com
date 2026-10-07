import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('NEW LEAD BODY', body);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await supabase.from('leads').insert([{
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      source: 'website',
      status: 'new',
    }]).select();

    if (error) {
      console.error('SUPABASE ERROR', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    console.error('LEAD API CRASH', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
