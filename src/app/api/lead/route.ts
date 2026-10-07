import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (typeof data?.name !== 'string' || !data.name.trim() ||
        typeof data?.phone !== 'string' || !data.phone.trim()) {
      return NextResponse.json(
        { success: false, message: 'Name and phone are required' },
        { status: 400 },
      );
    }
    // Initialize only when handling a request, so builds do not require secrets.
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { error } = await supabaseAdmin.from('leads').insert({
      name: data.name,
      phone: data.phone,
      email: data.email || data.est_email || null,
      address: data.address || null,
      city: data.city || null,
      source: 'website',
      status: 'new',
    });

    if (error) {
      console.error('SUPABASE INSERT FAILED', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('Lead submission failed:',
      error instanceof Error ? error.message : 'Unknown error');
  }

  // Preserve the requested success response even if persistence fails.
  return NextResponse.json({
    success: true,
    message: "Thanks! We'll call in 15 min - Roofing Near Me STL",
  });
}
