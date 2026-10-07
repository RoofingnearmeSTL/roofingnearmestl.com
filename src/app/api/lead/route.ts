import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // 1. Log everything - this is your buyer data mining
    console.log('NEW ROOF LEAD:', {
      ...data,
      timestamp: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for'),
    });

    // 2. TODO: Add Resend email later - for now logs to Vercel + returns success
    // This fixes the Formspree redirect bug - stays on YOUR site
    
    return NextResponse.json({ 
      success: true, 
      message: "Thanks! We'll call in 15 min - Roofing Near Me STL" 
    });
    
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
} 
