import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminRequest } from '@/lib/superAdminGuard';
import { handleApiError } from '@/lib/errors';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role environment variables');
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
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

    // Sanitize response to prevent plaintext password leakage (Finding C5)
    let sanitizedProfile = profileToUse;
    if (profileToUse) {
      const { plain_password, ...safeProfile } = profileToUse;
      sanitizedProfile = safeProfile;
    }

    let sanitizedRestaurant = rest;
    if (rest?.settings?.staff_metadata) {
      const sanitizedMeta: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest.settings.staff_metadata as Record<string, any>)) {
        if (v && typeof v === 'object') {
          const { plain_password, ...safeV } = v;
          sanitizedMeta[k] = safeV;
        } else {
          sanitizedMeta[k] = v;
        }
      }
      sanitizedRestaurant = {
        ...rest,
        settings: {
          ...rest.settings,
          staff_metadata: sanitizedMeta
        }
      };
    }

    return NextResponse.json({
      success: true,
      message: `Impersonation active for ${rest.name} (${targetRole})`,
      restaurant: sanitizedRestaurant,
      targetRole,
      ownerProfile: sanitizedProfile
    });
  } catch (err: any) {
    return handleApiError('Admin-Impersonate', err, 'Failed to initialize impersonation session', 500);
  }
}

