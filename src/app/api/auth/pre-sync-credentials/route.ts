import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone, restaurantName } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const cleanName = (fullName || restaurantName || 'Restaurant Owner').trim();
    const cleanRestName = (restaurantName || 'Restaurant').trim();
    const cleanPhone = (phone || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing service role configuration' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, supabaseKey);

    // 1. Check if user exists in auth.users
    const listRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = (listRes?.data?.users || []).find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);

    const userMetadata = {
      role: 'owner',
      name: cleanName,
      full_name: cleanName,
      display_name: cleanName,
      fullName: cleanName,
      phone: cleanPhone,
      restaurant_name: cleanRestName,
      restaurantName: cleanRestName
    };

    if (existing?.id) {
      // Sync exact typed password immediately
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
        password: cleanPassword,
        email_confirm: true,
        user_metadata: userMetadata,
        app_metadata: { role: 'owner' }
      });
      if (updErr) {
        console.warn('[PreSyncCredentials] User update error:', updErr.message);
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      console.log(`[PreSyncCredentials] Successfully updated ${cleanEmail} with owner typed password`);
      return NextResponse.json({ success: true, action: 'updated', userId: existing.id });
    } else {
      // Create user immediately with exact typed password
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: userMetadata,
        app_metadata: { role: 'owner' }
      });
      if (createErr) {
        console.warn('[PreSyncCredentials] User create error:', createErr.message);
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      console.log(`[PreSyncCredentials] Successfully created ${cleanEmail} with owner typed password`);
      return NextResponse.json({ success: true, action: 'created', userId: newUser?.user?.id });
    }
  } catch (err: any) {
    console.error('[PreSyncCredentials Error]:', err?.message || err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
