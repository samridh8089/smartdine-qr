import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

import { verifyStaffRequest } from '@/lib/staffAuthGuard';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const authCheck = await verifyStaffRequest(
      req,
      ['waiter', 'cashier', 'kitchen', 'supervisor', 'manager', 'owner', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized && authCheck.response) {
      return authCheck.response;
    }

    const { data: rest, error } = await supabaseAdmin
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .maybeSingle();

    if (error || !rest) {
      return NextResponse.json({ assignments: [] });
    }

    const assignments = rest.settings?.table_assignments || [];
    return NextResponse.json({ assignments: assignments.filter((a: any) => a.active !== false) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, assignments } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // Enforce authorization: only owner, manager, or super_admin can modify table assignments
    const authCheck = await verifyStaffRequest(req, ['owner', 'manager', 'super_admin'], restaurantId);
    if (!authCheck.isAuthorized && authCheck.response) {
      return authCheck.response;
    }

    // Prevent cross-restaurant and cross-role assignments:
    // Fetch valid staff profiles belonging exclusively to this restaurant
    const { data: validStaff } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, restaurant_id')
      .eq('restaurant_id', restaurantId);

    const validStaffMap = new Map((validStaff || []).map((s: any) => [s.id, s]));

    if (Array.isArray(assignments)) {
      for (const item of assignments) {
        const staffId = item.staffId || item.waiter_id || item.id;
        if (staffId && !validStaffMap.has(staffId) && !authCheck.isSuperAdmin) {
          return NextResponse.json({
            error: 'CROSS_RESTAURANT_ASSIGNMENT_FORBIDDEN',
            message: `Forbidden: Staff ID ${staffId} does not belong to restaurant ${restaurantId}. Tenant isolation enforced.`
          }, { status: 403 });
        }

        const staffRecord = staffId ? validStaffMap.get(staffId) : null;
        if (staffRecord && (staffRecord.role === 'kitchen' || item.role === 'kitchen')) {
          return NextResponse.json({
            error: 'CROSS_ROLE_ASSIGNMENT_FORBIDDEN',
            message: `Forbidden: Staff member with kitchen role cannot be assigned to front-of-house table service.`
          }, { status: 403 });
        }
      }
    }

    // Fetch restaurant settings
    const { data: rest, error: fetchErr } = await supabaseAdmin
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .maybeSingle();

    if (fetchErr || !rest) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const updatedSettings = {
      ...rest.settings,
      table_assignments: assignments || []
    };

    const { error: updateErr } = await supabaseAdmin
      .from('restaurants')
      .update({ settings: updatedSettings })
      .eq('id', restaurantId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || 'Failed to update table assignments' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Table assignments updated successfully',
      assignments: assignments || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error updating assignments' }, { status: 500 });
  }
}
