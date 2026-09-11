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
    const { entityType, entityId, restaurantId, updates, reason } = body;

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    let result: any = null;
    let actionName = `UPDATE_${entityType.toUpperCase()}`;
    let auditDetails = `Super Admin (${adminEmail}) updated ${entityType} ${entityId}`;

    if (entityType === 'restaurant') {
      const restUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) restUpdates.name = updates.name;
      if (updates.logo_url !== undefined) restUpdates.logo_url = updates.logo_url;
      if (updates.slug !== undefined) restUpdates.slug = updates.slug;
      if (updates.address !== undefined) restUpdates.address = updates.address;
      if (updates.gst_number !== undefined) restUpdates.gst_number = updates.gst_number;
      if (updates.phone !== undefined) restUpdates.phone = updates.phone;
      if (updates.settings !== undefined) restUpdates.settings = updates.settings;

      const { data, error } = await supabaseAdmin
        .from('restaurants')
        .update(restUpdates)
        .eq('id', entityId)
        .select()
        .single();
      if (error) throw error;
      result = data;
      auditDetails = `Updated Restaurant "${data.name}" (${Object.keys(updates).join(', ')})`;
    } else if (entityType === 'subscription') {
      const { data: currentRest } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('id', entityId)
        .single();

      const subUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.plan) subUpdates.subscription_plan = updates.plan;
      if (updates.status) subUpdates.subscription_status = updates.status;
      if (updates.billing_interval) subUpdates.billing_interval = updates.billing_interval;
      if (updates.trial_ends_at !== undefined) subUpdates.trial_ends_at = updates.trial_ends_at;

      const currentSettings = currentRest?.settings || {};
      if (updates.price !== undefined || updates.custom_price !== undefined) {
        currentSettings.custom_plan_price = Number(updates.price || updates.custom_price);
        subUpdates.settings = currentSettings;
      }

      const { data, error } = await supabaseAdmin
        .from('restaurants')
        .update(subUpdates)
        .eq('id', entityId)
        .select()
        .single();
      if (error) throw error;
      result = data;
      auditDetails = `Updated Subscription for "${data.name}": Plan=${data.subscription_plan}, Status=${data.subscription_status}, Expiry=${data.trial_ends_at}. Reason: ${reason || 'Manual modification'}`;
    } else if (entityType === 'owner') {
      const profUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.full_name !== undefined) profUpdates.full_name = updates.full_name;
      if (updates.email !== undefined) profUpdates.email = updates.email;
      if (updates.phone !== undefined) profUpdates.phone = updates.phone;
      if (updates.plain_password !== undefined) profUpdates.plain_password = updates.plain_password;

      // If resetting password and Supabase Auth Admin is available
      if (updates.new_password) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(entityId, {
            password: updates.new_password
          });
          profUpdates.plain_password = updates.new_password;
        } catch (pwErr) {
          console.warn('[Admin Password Reset Notice]:', pwErr);
        }
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(profUpdates)
        .eq('id', entityId)
        .select()
        .single();
      if (error) throw error;
      result = data;
      auditDetails = `Updated Owner "${data.full_name || data.email}" (${Object.keys(updates).join(', ')}). Reason: ${reason || 'Admin update'}`;
    } else if (entityType === 'staff') {
      const staffUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.full_name !== undefined) staffUpdates.full_name = updates.full_name;
      if (updates.email !== undefined) staffUpdates.email = updates.email;
      if (updates.phone !== undefined) staffUpdates.phone = updates.phone;
      if (updates.role !== undefined) staffUpdates.role = updates.role;
      if (updates.pin !== undefined) staffUpdates.plain_password = updates.pin;
      if (updates.shift !== undefined || updates.permissions !== undefined) {
        // Stored in settings/metadata if needed
        staffUpdates.updated_at = new Date().toISOString();
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(staffUpdates)
        .eq('id', entityId)
        .select()
        .single();
      if (error) throw error;
      result = data;
      auditDetails = `Updated Staff Member "${data.full_name}" (Role: ${data.role})`;
    } else if (entityType === 'table') {
      const tableUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) tableUpdates.name = updates.name;

      const { data, error } = await supabaseAdmin
        .from('tables')
        .update(tableUpdates)
        .eq('id', entityId)
        .select()
        .single();
      if (error) throw error;
      result = data;
      auditDetails = `Updated Table "${data.name}"`;
    }

    // Insert audit log
    try {
      const targetRestId = restaurantId || result?.restaurant_id || (entityType === 'restaurant' ? entityId : null);
      if (targetRestId) {
        await supabaseAdmin.from('audit_logs').insert({
          restaurant_id: targetRestId,
          user_email: adminEmail,
          action: actionName,
          details: auditDetails,
          created_at: new Date().toISOString()
        });
      }
    } catch (auditErr) {
      console.warn('[Audit Log Write Warning]:', auditErr);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `${entityType} updated successfully`
    });
  } catch (err: any) {
    return handleApiError('Admin-EntityEdit', err, 'Failed to update entity', 500);
  }
}
