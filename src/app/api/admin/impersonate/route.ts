import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminRequest } from '@/lib/superAdminGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const authCheck = await verifySuperAdminRequest(req);
    if (!authCheck.isSuperAdmin && authCheck.response) {
      return authCheck.response;
    }

    const body = await req.json();
    const { targetRestaurantId } = body;

    if (!targetRestaurantId) {
      return NextResponse.json({ error: 'targetRestaurantId is required' }, { status: 400 });
    }

    const adminEmail = authCheck.user?.email || null;

    // 2. Fetch target restaurant
    const { data: rest, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', targetRestaurantId)
      .maybeSingle();

    if (restErr || !rest) {
      return NextResponse.json({ error: 'Target restaurant not found' }, { status: 404 });
    }

    // 3. Fetch owner profile for this restaurant
    const { data: ownerProf } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('restaurant_id', targetRestaurantId)
      .eq('role', 'owner')
      .maybeSingle();

    // 4. Record security audit log entry
    try {
      await supabaseAdmin.from('audit_logs').insert({
        restaurant_id: targetRestaurantId,
        user_email: adminEmail || 'system',
        action: 'SUPER_ADMIN_IMPERSONATION',
        details: `Super Admin (${adminEmail || 'system'}) opened session for restaurant "${rest.name}" (ID: ${rest.id})`
      });
    } catch (auditErr) {
      console.warn('[Impersonation Audit Notice]:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Impersonation active for ${rest.name}`,
      restaurant: rest,
      ownerProfile: ownerProf || {
        id: `impersonated_${rest.id}`,
        full_name: `${rest.name} Owner (Impersonated)`,
        email: rest.phone ? `${rest.slug}@cleverops.in` : 'owner@cleverops.in',
        role: 'owner',
        restaurant_id: rest.id
      }
    });
  } catch (err: any) {
    console.error('[API Impersonate] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to initialize impersonation' }, { status: 500 });
  }
}
