import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminRequest } from '@/lib/superAdminGuard';
import { handleApiError } from '@/lib/errors';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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

    const targetRole = body.targetRole || 'owner';

    // 3. Fetch role-specific profile for this restaurant
    const { data: roleProf } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('restaurant_id', targetRestaurantId)
      .eq('role', targetRole)
      .maybeSingle();

    // Fallback if not specifically found
    let profileToUse = roleProf;
    if (!profileToUse) {
      if (targetRole === 'kitchen') {
        profileToUse = {
          id: `impersonated_kitchen_${rest.id}`,
          full_name: `${rest.name} Kitchen (Impersonated)`,
          email: `${rest.slug}_kitchen@cleverops.in`,
          role: 'kitchen',
          restaurant_id: rest.id
        };
      } else if (targetRole === 'waiter') {
        profileToUse = {
          id: `impersonated_waiter_${rest.id}`,
          full_name: `${rest.name} Waiter (Impersonated)`,
          email: `${rest.slug}_waiter@cleverops.in`,
          role: 'waiter',
          restaurant_id: rest.id
        };
      } else {
        const { data: anyOwner } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('restaurant_id', targetRestaurantId)
          .eq('role', 'owner')
          .maybeSingle();
        profileToUse = anyOwner || {
          id: `impersonated_owner_${rest.id}`,
          full_name: `${rest.name} Owner (Impersonated)`,
          email: rest.phone ? `${rest.slug}@cleverops.in` : 'owner@cleverops.in',
          role: 'owner',
          restaurant_id: rest.id
        };
      }
    }

    // 4. Record security audit log entry
    try {
      await supabaseAdmin.from('audit_logs').insert({
        restaurant_id: targetRestaurantId,
        user_email: adminEmail || 'Founder',
        action: 'SUPER_ADMIN_IMPERSONATION',
        details: `Super Admin (${adminEmail || 'Founder'}) opened ${targetRole.toUpperCase()} Portal for restaurant "${rest.name}" (ID: ${rest.id})`
      });
    } catch (auditErr) {
      console.warn('[Impersonation Audit Notice]:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Impersonation active for ${rest.name} (${targetRole})`,
      restaurant: rest,
      targetRole,
      ownerProfile: profileToUse
    });
  } catch (err: any) {
    return handleApiError('Admin-Impersonate', err, 'Failed to initialize impersonation session', 500);
  }
}

