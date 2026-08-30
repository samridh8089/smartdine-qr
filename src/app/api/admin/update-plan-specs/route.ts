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
    const { planId, price_monthly, price_yearly, max_tables, max_items, allow_waiter, allow_analytics, allow_branding, kds_type, features } = body;

    if (!planId || !['starter', 'growth', 'pro', 'business', 'premium'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const numMonthly = Number(price_monthly);
    const numYearly = Number(price_yearly);
    const numMaxTables = Number(max_tables);
    const numMaxItems = Number(max_items);

    if (isNaN(numMonthly) || isNaN(numYearly) || isNaN(numMaxTables) || isNaN(numMaxItems)) {
      return NextResponse.json({ error: 'Invalid numerical values for pricing or limits' }, { status: 400 });
    }

    const isWaiter = Boolean(allow_waiter);
    const isAnalytics = Boolean(allow_analytics);
    const isBranding = Boolean(allow_branding);
    const kdsVal = kds_type === 'premium' ? 'premium' : 'standard';

    const specsObj = {
      max_tables: numMaxTables,
      max_items: numMaxItems,
      allow_waiter: isWaiter,
      allow_analytics: isAnalytics,
      allow_branding: isBranding,
      kds_type: kdsVal
    };

    // 1. Read existing plan row to preserve non-__SPECS__ feature bullets
    const { data: existingRow } = await supabaseAdmin
      .from('pricing_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    let textFeatures: string[] = [];

    if (Array.isArray(features) && features.length > 0) {
      textFeatures = features.filter((f: string) => typeof f === 'string' && !f.startsWith('__SPECS__:'));
    }
    else if (existingRow && Array.isArray(existingRow.features)) {
      textFeatures = existingRow.features.filter((f: string) => typeof f === 'string' && !f.startsWith('__SPECS__:'));
    }

    if (textFeatures.length === 0) {
      textFeatures = [
        kdsVal === 'premium' ? 'Premium KDS with Sound Alerts' : 'Standard KDS',
        ...(isAnalytics ? ['Analytics Dashboard'] : ['Basic Sales Overview']),
        ...(isWaiter ? ['Waiter Panel & Real-Time Calling'] : []),
        ...(isBranding ? ['Custom Branding & Logo Upload'] : []),
        'QR Code Generation & Table Ordering',
        'Real-Time Order Push Alerts'
      ];
    } else {
      if (kdsVal === 'premium' && !textFeatures.includes('Premium KDS with Sound Alerts')) {
        textFeatures = textFeatures.map(f => f === 'Standard KDS' ? 'Premium KDS with Sound Alerts' : f);
        if (!textFeatures.includes('Premium KDS with Sound Alerts')) textFeatures.unshift('Premium KDS with Sound Alerts');
      } else if (kdsVal === 'standard' && !textFeatures.includes('Standard KDS')) {
        textFeatures = textFeatures.map(f => f === 'Premium KDS with Sound Alerts' ? 'Standard KDS' : f);
        if (!textFeatures.includes('Standard KDS')) textFeatures.unshift('Standard KDS');
      }

      if (isAnalytics && !textFeatures.includes('Analytics Dashboard')) {
        textFeatures = textFeatures.map(f => f === 'Basic Sales Overview' ? 'Analytics Dashboard' : f);
        if (!textFeatures.includes('Analytics Dashboard')) textFeatures.push('Analytics Dashboard');
      } else if (!isAnalytics && textFeatures.includes('Analytics Dashboard')) {
        textFeatures = textFeatures.map(f => f === 'Analytics Dashboard' ? 'Basic Sales Overview' : f);
      }

      if (isWaiter && !textFeatures.includes('Waiter Panel & Real-Time Calling')) {
        textFeatures.push('Waiter Panel & Real-Time Calling');
      } else if (!isWaiter && textFeatures.includes('Waiter Panel & Real-Time Calling')) {
        textFeatures = textFeatures.filter(f => f !== 'Waiter Panel & Real-Time Calling');
      }

      if (isBranding && !textFeatures.includes('Custom Branding & Logo Upload')) {
        textFeatures.push('Custom Branding & Logo Upload');
      } else if (!isBranding && textFeatures.includes('Custom Branding & Logo Upload')) {
        textFeatures = textFeatures.filter(f => f !== 'Custom Branding & Logo Upload');
      }
    }

    const finalFeatures = [...textFeatures, `__SPECS__:${JSON.stringify(specsObj)}`];

    // 2. UPSERT DB
    const { data: upserted, error: upsertErr } = await supabaseAdmin
      .from('pricing_plans')
      .upsert({
        id: planId,
        name: planId === 'starter' ? 'Starter' : planId === 'pro' ? 'Pro' : 'Premium',
        price_monthly: numMonthly,
        price_yearly: numYearly,
        features: finalFeatures,
        updated_at: new Date().toISOString()
      })
      .select();

    if (upsertErr) {
      console.error('[API Update-Plan-Specs DB Error]:', upsertErr);
      return handleApiError('Update-Plan-Specs DB', upsertErr, 'Failed to update plan specifications in database', 500);
    }

    // 3. Fresh SELECT to verify persistence
    const { data: verified, error: readErr } = await supabaseAdmin
      .from('pricing_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (readErr || !verified) {
      return handleApiError('Update-Plan-Specs Read', readErr, 'Failed to verify saved plan specifications', 500);
    }

    // 4. Compare saved values against requested values
    const specsTag = verified.features?.find((f: string) => typeof f === 'string' && f.startsWith('__SPECS__:'));
    let savedSpecs: any = {};
    if (specsTag) {
      try {
        savedSpecs = JSON.parse(specsTag.replace('__SPECS__:', ''));
      } catch (e) {}
    }

    const matches = 
      verified.price_monthly === numMonthly &&
      verified.price_yearly === numYearly &&
      savedSpecs.max_tables === numMaxTables &&
      savedSpecs.max_items === numMaxItems;

    if (!matches) {
      return NextResponse.json({ error: 'Database persistence check failed: Saved values do not match requested specifications.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${planId.toUpperCase()} plan specifications.`,
      plan: {
        id: verified.id,
        name: verified.name,
        price_monthly: verified.price_monthly,
        price_yearly: verified.price_yearly,
        max_tables: savedSpecs.max_tables,
        max_items: savedSpecs.max_items,
        allow_waiter: savedSpecs.allow_waiter,
        allow_analytics: savedSpecs.allow_analytics,
        allow_branding: savedSpecs.allow_branding,
        kds_type: savedSpecs.kds_type,
        features: textFeatures
      }
    });
  } catch (err: any) {
    return handleApiError('Update-Plan-Specs', err, 'Failed to update plan specifications', 500);
  }
}

