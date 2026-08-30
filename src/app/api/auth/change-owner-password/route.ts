import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';


const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const body = await req.json();

    const validation = validateSchema(body, {
      currentPassword: { rules: [Validators.string({ min: 6, max: 128 })], required: true },
      newPassword: { rules: [Validators.string({ min: 6, max: 128 })], required: true },
      email: { rules: [Validators.email()], required: false },
      userId: { rules: [Validators.string({ max: 100 })], required: false }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { currentPassword, newPassword, email: clientEmail, userId: clientUserId } = body;

    // 1. Resolve user identity from Auth token or client parameters
    let email = clientEmail || '';
    let userId = clientUserId || '';

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        email = user.email || email;
        userId = user.id;
      }
    }

    if (!email && userId) {
      const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (adminUser?.user?.email) {
        email = adminUser.user.email;
      } else {
        const { data: prof } = await supabaseAdmin.from('profiles').select('email').eq('id', userId).maybeSingle();
        if (prof?.email) email = prof.email;
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Unauthenticated user session' }, { status: 401 });
    }

    // 2. Validate current password credentials via Supabase Auth API
    const tempAnonClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );


    const { data: authResult, error: signInError } = await tempAnonClient.auth.signInWithPassword({
      email,
      password: currentPassword
    });

    if (signInError || !authResult.user) {
      return NextResponse.json({ error: 'Current password is incorrect. Please check and try again.' }, { status: 400 });
    }

    // 3. Update user password securely via Supabase Admin Auth API (Independent of subscription status)
    const targetId = authResult.user.id || userId;
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
      password: newPassword
    });

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || 'Failed to update password' }, { status: 500 });
    }

    // Update plain_password on profile if row exists
    try {
      await supabaseAdmin.from('profiles').update({ plain_password: newPassword }).eq('id', targetId);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (err: any) {
    return handleApiError('Change-Owner-Password', err, 'Failed to change password. Please try again later.', 500);
  }
}


