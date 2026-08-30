import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminRequest } from '@/lib/superAdminGuard';
import { 
  DEFAULT_PLAN_SPECS, 
  parsePlanSpec, 
  serializePlanSpec, 
  FEATURE_CATALOG, 
  RESOURCE_LIMIT_CATALOG, 
  AI_LIMIT_CATALOG, 
  PlanEntitlementSpec 
} from '@/lib/entitlements';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);


// GET: Fetch all pricing plans, specs, active restaurant counts, and catalogs
export async function GET(req: Request) {
  try {
    const authCheck = await verifySuperAdminRequest(req);
    if (!authCheck.isSuperAdmin && authCheck.response) {
      return authCheck.response;
    }

    const [plansRes, restsRes] = await Promise.all([
      supabaseAdmin.from('pricing_plans').select('*').order('created_at', { ascending: true }),
      supabaseAdmin.from('restaurants').select('id, subscription_plan, subscription_status')
    ]);

    const dbRows = plansRes.data || [];
    const restaurants = restsRes.data || [];

    // Map active restaurant counts per plan ID
    const usageCounts: Record<string, number> = {};
    restaurants.forEach(r => {
      const p = (r.subscription_plan || 'starter').toLowerCase();
      usageCounts[p] = (usageCounts[p] || 0) + 1;
    });

    // Parse specifications for all plans
    const parsedPlans: PlanEntitlementSpec[] = dbRows.map(row => parsePlanSpec(row));

    // Ensure all 4 default plans exist in response
    const defaultIds = ['starter', 'pro', 'premium', 'custom'];
    defaultIds.forEach(id => {
      if (!parsedPlans.some(p => p.id === id)) {
        parsedPlans.push(DEFAULT_PLAN_SPECS[id]);
      }
    });

    parsedPlans.sort((a, b) => a.sort_order - b.sort_order);

    return NextResponse.json({
      success: true,
      plans: parsedPlans,
      usageCounts,
      featureCatalog: FEATURE_CATALOG,
      resourceCatalog: RESOURCE_LIMIT_CATALOG,
      aiCatalog: AI_LIMIT_CATALOG
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch plans' }, { status: 500 });
  }
}

// POST: Create or Update a Pricing Plan
export async function POST(req: Request) {
  try {
    const authCheck = await verifySuperAdminRequest(req);
    if (!authCheck.isSuperAdmin && authCheck.response) {
      return authCheck.response;
    }

    const body = await req.json();
    const { action, planSpec, restId, targetPlanId, adminUser } = body;

    // Action 1: Assign Plan to Restaurant
    if (action === 'assign_restaurant_plan') {
      if (!restId || !targetPlanId) {
        return NextResponse.json({ error: 'Restaurant ID and target plan ID required' }, { status: 400 });
      }

      const { data: oldRest } = await supabaseAdmin.from('restaurants').select('subscription_plan').eq('id', restId).single();
      const oldPlan = oldRest?.subscription_plan || 'starter';

      const { data: updatedRest, error: rErr } = await supabaseAdmin
        .from('restaurants')
        .update({ subscription_plan: targetPlanId.toLowerCase(), updated_at: new Date().toISOString() })
        .eq('id', restId)
        .select();

      if (rErr) throw new Error(rErr.message);

      // Log Audit Entry
      try {
        await supabaseAdmin.from('audit_logs').insert({
          restaurant_id: restId,
          user_email: adminUser || 'Super Admin',
          action: 'CHANGE_RESTAURANT_PLAN',
          details: `Changed plan for restaurant ${restId} from ${oldPlan.toUpperCase()} to ${targetPlanId.toUpperCase()}`
        });
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Plan changed to ${targetPlanId.toUpperCase()} successfully`, restaurant: updatedRest[0] });
    }

    // Action 2: Duplicate Plan
    if (action === 'duplicate_plan') {
      const { sourcePlanId, newPlanId, newPlanName } = body;
      const { data: sourceRow } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', sourcePlanId).maybeSingle();
      const sourceSpec = parsePlanSpec(sourceRow || { id: sourcePlanId });

      const newSpec: PlanEntitlementSpec = {
        ...sourceSpec,
        id: newPlanId.toLowerCase(),
        slug: newPlanId.toLowerCase(),
        name: newPlanName.toUpperCase(),
        sort_order: sourceSpec.sort_order + 1
      };

      const payload = serializePlanSpec(newSpec);
      const { data: dupData, error: dupErr } = await supabaseAdmin.from('pricing_plans').insert(payload).select();
      if (dupErr) throw new Error(dupErr.message);

      return NextResponse.json({ success: true, message: `Plan duplicated as ${newPlanName}`, plan: parsePlanSpec(dupData[0]) });
    }

    // Action 3: Save / Update Plan Specifications
    if (!planSpec || !planSpec.id) {
      return NextResponse.json({ error: 'Plan specification payload required' }, { status: 400 });
    }

    const normalizedSpec: PlanEntitlementSpec = {
      ...DEFAULT_PLAN_SPECS[planSpec.id.toLowerCase()],
      ...planSpec,
      id: planSpec.id.toLowerCase(),
      name: planSpec.name.toUpperCase()
    };

    const dbPayload = serializePlanSpec(normalizedSpec);

    // Check if existing plan record exists in pricing_plans
    const { data: existingPlan } = await supabaseAdmin
      .from('pricing_plans')
      .select('id')
      .eq('id', dbPayload.id)
      .maybeSingle();

    let savedPlanData: any = null;
    let saveErr: any = null;

    if (existingPlan) {
      const { data, error } = await supabaseAdmin
        .from('pricing_plans')
        .update(dbPayload)
        .eq('id', dbPayload.id)
        .select();
      savedPlanData = data;
      saveErr = error;
    } else {
      const { data, error } = await supabaseAdmin
        .from('pricing_plans')
        .insert(dbPayload)
        .select();
      savedPlanData = data;
      saveErr = error;
    }

    if (saveErr) throw new Error(saveErr.message);

    // Audit Log Entry
    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_email: adminUser || 'Super Admin',
        action: 'UPDATE_PRICING_PLAN',
        details: `Updated SaaS plan "${normalizedSpec.name}" (Price: ₹${normalizedSpec.price_monthly}/mo, Limits & Features updated)`
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Plan "${normalizedSpec.name}" saved successfully`,
      plan: parsePlanSpec((savedPlanData && savedPlanData[0]) || normalizedSpec)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save plan' }, { status: 500 });
  }
}

// DELETE: Delete a plan ONLY if no active restaurants depend on it
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId')?.toLowerCase();

    if (!planId) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

    if (['starter', 'pro', 'premium', 'custom'].includes(planId)) {
      return NextResponse.json({ error: 'Default system plans (Starter, Pro, Premium, Custom) cannot be deleted. You can deactivate them instead.' }, { status: 400 });
    }

    // Check if any restaurant depends on this plan
    const { data: dependentRests } = await supabaseAdmin
      .from('restaurants')
      .select('id, name')
      .eq('subscription_plan', planId);

    if (dependentRests && dependentRests.length > 0) {
      return NextResponse.json({
        error: `Cannot delete plan "${planId.toUpperCase()}": ${dependentRests.length} active restaurant(s) are currently subscribed to it (${dependentRests.map(r => r.name.trim()).join(', ')}). Reassign them to another plan first.`
      }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin.from('pricing_plans').delete().eq('id', planId);
    if (delErr) throw new Error(delErr.message);

    return NextResponse.json({ success: true, message: `Plan "${planId.toUpperCase()}" deleted successfully` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete plan' }, { status: 500 });
  }
}
