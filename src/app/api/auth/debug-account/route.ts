import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const cleanEmail = (email || '').trim().toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing service role configuration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // 1. Auth users
    const { data: usersData, error: userErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matchingUsers = (usersData?.users || []).filter(u => u.email?.toLowerCase().trim() === cleanEmail);

    // 2. Restaurants
    const { data: rests, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .or(`settings->>owner_email.eq.${cleanEmail},settings->>email.eq.${cleanEmail}`);

    // 3. Profiles
    const { data: profs, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .ilike('email', cleanEmail);

    // 4. Try test upsert into profiles for the matched user
    let upsertTestResult: any = null;
    if (matchingUsers.length > 0 && rests && rests.length > 0) {
      const u = matchingUsers[0];
      const r = rests[0];
      const testUpsert = await supabaseAdmin.from('profiles').upsert({
        id: u.id,
        restaurant_id: r.id,
        email: cleanEmail,
        full_name: 'Owner',
        role: 'owner',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      upsertTestResult = {
        error: testUpsert.error,
        status: testUpsert.status,
        statusText: testUpsert.statusText
      };
    }

    return NextResponse.json({
      matchingUsers: matchingUsers.map(u => ({ id: u.id, email: u.email, confirmed: u.email_confirmed_at, metadata: u.user_metadata })),
      matchingRestaurants: rests,
      matchingProfiles: profs,
      upsertTestResult
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
