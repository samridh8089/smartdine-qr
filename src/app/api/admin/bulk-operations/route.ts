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

    const adminEmail = authCheck.user?.email || 'Founder';
    const body = await req.json();
    const { restaurantIds, action, payload } = body;

    if (!restaurantIds || !Array.isArray(restaurantIds) || restaurantIds.length === 0) {
      return NextResponse.json({ error: 'restaurantIds array is required' }, { status: 400 });
    }

    let affected = 0;
    const nowIso = new Date().toISOString();
    const auditEntries: any[] = [];

    if (action === 'extend_license') {
      const days = payload?.days || 30;
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabaseAdmin
        .from('restaurants')
        .update({
          subscription_status: 'active',
          trial_ends_at: expiry,
          updated_at: nowIso
        })
        .in('id', restaurantIds)
        .select('id, name');
      if (error) throw error;
      affected = data?.length || 0;

      for (const r of data || []) {
        auditEntries.push({
          restaurant_id: r.id,
          user_email: adminEmail,
          action: 'BULK_EXTEND_LICENSE',
          details: `Super Admin bulk-extended license for ${days} days (New expiry: ${expiry})`,
          created_at: nowIso
        });
      }
    } else if (action === 'pause') {
      const { data, error } = await supabaseAdmin
        .from('restaurants')
        .update({
          subscription_status: 'cancelled',
          updated_at: nowIso
        })
        .in('id', restaurantIds)
        .select('id, name');
      if (error) throw error;
      affected = data?.length || 0;

      for (const r of data || []) {
        auditEntries.push({
          restaurant_id: r.id,
          user_email: adminEmail,
          action: 'BULK_PAUSE_LICENSE',
          details: `Super Admin bulk-paused license for restaurant "${r.name}"`,
          created_at: nowIso
        });
      }
    } else if (action === 'resume') {
      const { data, error } = await supabaseAdmin
        .from('restaurants')
        .update({
          subscription_status: 'active',
          updated_at: nowIso
        })
        .in('id', restaurantIds)
        .select('id, name');
      if (error) throw error;
      affected = data?.length || 0;

      for (const r of data || []) {
        auditEntries.push({
          restaurant_id: r.id,
          user_email: adminEmail,
          action: 'BULK_RESUME_LICENSE',
          details: `Super Admin bulk-resumed license for restaurant "${r.name}"`,
          created_at: nowIso
        });
      }
    } else if (action === 'update_plan') {
      const newPlan = payload?.plan || 'pro';
      const { data, error } = await supabaseAdmin
        .from('restaurants')
        .update({
          subscription_plan: newPlan,
          updated_at: nowIso
        })
        .in('id', restaurantIds)
        .select('id, name');
      if (error) throw error;
      affected = data?.length || 0;

      for (const r of data || []) {
        auditEntries.push({
          restaurant_id: r.id,
          user_email: adminEmail,
          action: 'BULK_UPDATE_PLAN',
          details: `Super Admin bulk-updated plan to ${newPlan.toUpperCase()}`,
          created_at: nowIso
        });
      }
    } else if (action === 'broadcast') {
      const message = payload?.message || '';
      for (const rId of restaurantIds) {
        auditEntries.push({
          restaurant_id: rId,
          user_email: adminEmail,
          action: 'BROADCAST_MESSAGE',
          details: `Super Admin broadcast message: "${message}"`,
          created_at: nowIso
        });
      }
      affected = restaurantIds.length;
    }

    if (auditEntries.length > 0) {
      try {
        await supabaseAdmin.from('audit_logs').insert(auditEntries);
      } catch (e) {
        console.warn('[Bulk Audit Log Insert Notice]:', e);
      }
    }

    return NextResponse.json({
      success: true,
      action,
      affected,
      message: `Successfully executed ${action} across ${affected} restaurants`
    });
  } catch (err: any) {
    return handleApiError('Admin-BulkOperations', err, 'Failed to execute bulk operation', 500);
  }
}
