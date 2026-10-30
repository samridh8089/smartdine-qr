import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email, secret, action, newPassword } = await req.json();
    if (secret !== 'PURGE_ACCOUNT_EXPLICIT_CONFIRMATION_2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing service role credentials' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, supabaseKey);

    if (action === 'set_password' && email && newPassword) {
      const cleanTarget = (email || '').trim().toLowerCase();
      const listRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = (listRes?.data?.users || []).find((u: any) => u.email?.toLowerCase().trim() === cleanTarget);
      if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const { error: updErr } = await admin.auth.admin.updateUserById(found.id, {
        password: String(newPassword).trim(),
        email_confirm: true
      });
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ success: true, message: `Password successfully updated for ${cleanTarget}` });
    }

    const { data: usersData, error: userErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const users = (usersData?.users || []).map(u => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata
    }));

    const cleanEmail = (email || '').trim().toLowerCase();
    const matchedUsers = cleanEmail ? users.filter(u => u.email?.toLowerCase().includes(cleanEmail)) : users.slice(0, 5);

    const { data: profiles } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: restaurants } = await admin
      .from('restaurants')
      .select('id, name, owner_id, slug, subscription_plan, created_at, settings')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: transactions } = await admin
      .from('billing_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      queryEmail: cleanEmail,
      matchedUsers,
      recentUsersCount: users.length,
      latest5Users: users.slice(0, 5),
      profiles: cleanEmail ? (profiles || []).filter(p => p.email?.toLowerCase().includes(cleanEmail)) : profiles,
      restaurants: cleanEmail ? (restaurants || []).filter(r => JSON.stringify(r).toLowerCase().includes(cleanEmail)) : restaurants,
      transactions: transactions
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
