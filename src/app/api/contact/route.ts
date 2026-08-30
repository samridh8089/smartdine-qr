import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateSchema(body, {
      name: { rules: [Validators.string({ min: 2, max: 100 })], required: true },
      email: { rules: [Validators.email()], required: true },
      phone: { rules: [Validators.phone()], required: false },
      restaurantName: { rules: [Validators.string({ max: 100 })], required: false },
      message: { rules: [Validators.string({ min: 5, max: 2000 })], required: true }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { name, email, phone, restaurantName, message } = body;

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
    return handleApiError('Contact', err, 'Failed to process inquiry. Please try again later.', 500);
  }
}


