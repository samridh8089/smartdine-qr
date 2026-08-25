import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email or username is required' }, { status: 400 });
    }

    const cleanInput = email.trim().toLowerCase();

    // 1. Check profiles table by email or username
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, email, restaurant_id, restaurants(name)')
      .or(`email.ilike.${cleanInput},id.eq.${cleanInput}`)
      .maybeSingle();

    if (existingProfile && existingProfile.restaurant_id) {
      const restName = (existingProfile.restaurants as any)?.name || 'an existing restaurant';
      return NextResponse.json({
        available: false,
        exists: true,
        error: `An account with this email/username (${cleanInput}) is already linked to ${restName}. Please log in.`
      }, { status: 200 });
    }

    // 2. Check auth users list
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matchedUser = (users || []).find(u => 
      u.email?.toLowerCase().trim() === cleanInput ||
      u.id === cleanInput ||
      u.email?.toLowerCase().startsWith(cleanInput)
    );

    if (matchedUser) {
      // Check if user owns a restaurant
      const { data: userRest } = await supabaseAdmin
        .from('restaurants')
        .select('id, name')
        .eq('owner_id', matchedUser.id)
        .maybeSingle();

      if (userRest) {
        return NextResponse.json({
          available: false,
          exists: true,
          error: `Account (${matchedUser.email}) already owns restaurant ${userRest.name}. Please log in.`
        }, { status: 200 });
      }
    }

    return NextResponse.json({ available: true, exists: false });
  } catch (err: any) {
    console.error('[Check Email Availability Error]:', err?.message);
    return NextResponse.json({ error: 'Failed to validate email availability' }, { status: 500 });
  }
}
