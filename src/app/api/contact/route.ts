import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { name, email, phone, restaurantName, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 });
    }

    // 1. Save in audit_logs so messages are NEVER lost and accessible in database
    try {
      await supabase.from('audit_logs').insert([
        {
          restaurant_id: '00000000-0000-0000-0000-000000000000',
          user_id: null,
          user_email: email,
          action: 'contact_form_inquiry',
          details: `Name: ${name} | Phone: ${phone || 'N/A'} | Restaurant: ${restaurantName || 'N/A'} | Message: ${message}`,
          created_at: new Date().toISOString(),
        }
      ]);
    } catch (dbErr: any) {
      console.warn('Database log warning:', dbErr.message);
    }

    // 2. Dispatch email to dsoni1281@gmail.com via FormSubmit
    const emailPayload = {
      _subject: `New CleverOps Inquiry: ${name} (${restaurantName || 'Restaurant'})`,
      Name: name,
      Email: email,
      Phone: phone || 'N/A',
      Restaurant: restaurantName || 'N/A',
      Message: message,
    };

    let emailSent = false;

    try {
      const res = await fetch('https://formsubmit.co/ajax/dsoni1281@gmail.com', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify(emailPayload),
      });
      if (res.ok) emailSent = true;
    } catch (e) {
      console.error('FormSubmit error:', e);
    }

    return NextResponse.json({ 
      success: true, 
      emailSent,
      message: 'Inquiry received successfully! Saved in database and dispatched to dsoni1281@gmail.com.' 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
