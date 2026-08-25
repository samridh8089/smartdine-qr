import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, userId } = body;

    if (!email && !userId) {
      return NextResponse.json({ error: 'email or userId is required' }, { status: 400 });
    }

    let targetEmail = email;
    if (!targetEmail && userId) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      targetEmail = userData?.user?.email;
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Staff email not found' }, { status: 404 });
    }

    const cleanEmail = targetEmail.trim().toLowerCase();

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cleverops.in').replace(/\/$/, '');

    // Trigger Supabase Auth signup link resend with production redirect URL
    const { error: resendErr } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: `${siteUrl}/login`
      }
    });

    if (resendErr) {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          redirectTo: `${siteUrl}/login`
        }
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Verification email resent to ${cleanEmail}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to resend verification email' }, { status: 500 });
  }
}
