import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email, purgeSecret } = await req.json();
    if (purgeSecret !== 'PURGE_ACCOUNT_EXPLICIT_CONFIRMATION_2026') {
      return NextResponse.json({ error: 'Unauthorized purge request' }, { status: 403 });
    }
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing service role configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const log: string[] = [];

    // 1. Find all restaurants associated with this email
    const { data: matchedRests } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, owner_id, settings');

    const restIdsToDelete: string[] = [];
    for (const r of matchedRests || []) {
      if (
        r.settings?.owner_email?.toLowerCase() === cleanEmail ||
        r.settings?.email?.toLowerCase() === cleanEmail
      ) {
        restIdsToDelete.push(r.id);
      }
    }

    // 2. Also check if profile exists
    const { data: profs } = await supabaseAdmin
      .from('profiles')
      .select('id, restaurant_id, email')
      .ilike('email', cleanEmail);

    for (const p of profs || []) {
      if (p.restaurant_id && !restIdsToDelete.includes(p.restaurant_id)) {
        restIdsToDelete.push(p.restaurant_id);
      }
    }

    // 3. For all matching restaurants: delete child tables first
    for (const rId of restIdsToDelete) {
      log.push(`Cleaning restaurant ${rId}...`);
      await supabaseAdmin.from('billing_transactions').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('order_items').delete().eq('order_id', rId);
      await supabaseAdmin.from('orders').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('menu_items').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('categories').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('tables').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('customer_calls').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('activity_logs').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('system_events').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('audit_logs').delete().eq('restaurant_id', rId);
      await supabaseAdmin.from('profiles').delete().eq('restaurant_id', rId);
      const { error: delRestErr } = await supabaseAdmin.from('restaurants').delete().eq('id', rId);
      if (delRestErr) log.push(`Error deleting restaurant ${rId}: ${delRestErr.message}`);
      else log.push(`Deleted restaurant ${rId}`);
    }

    // 4. Delete profiles by email
    const { error: delProfErr } = await supabaseAdmin.from('profiles').delete().ilike('email', cleanEmail);
    if (delProfErr) log.push(`Error deleting profile: ${delProfErr.message}`);
    else log.push(`Deleted profile for ${cleanEmail}`);

    // 5. Delete all auth.users matching this email
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matchingUsers = (usersData?.users || []).filter(u => u.email?.toLowerCase().trim() === cleanEmail);

    for (const u of matchingUsers) {
      await supabaseAdmin.from('profiles').delete().eq('id', u.id);
      const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (delAuthErr) log.push(`Error deleting auth user ${u.id}: ${delAuthErr.message}`);
      else log.push(`Deleted auth user ${u.id}`);
    }

    return NextResponse.json({
      success: true,
      purgedEmail: cleanEmail,
      deletedRestaurants: restIdsToDelete,
      deletedAuthUsersCount: matchingUsers.length,
      log
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
