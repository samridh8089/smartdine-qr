import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminRequest } from '@/lib/superAdminGuard';
import { handleApiError } from '@/lib/errors';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const authCheck = await verifySuperAdminRequest(req);
    if (!authCheck.isSuperAdmin && authCheck.response) {
      return authCheck.response;
    }

    // 1. Fetch restaurants
    const { data: rests } = await supabaseAdmin.from('restaurants').select('*');
    const allRests = rests || [];

    // 2. Fetch orders
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, total, status, created_at, restaurant_id')
      .order('created_at', { ascending: true });
    const allOrders = orders || [];

    // 3. Compute 7-day or 30-day buckets for trends
    const now = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().split('T')[0]);
    }

    // Revenue & orders trend
    const revenueTrend = days.map(day => {
      let subscriptionRev = 0;
      allRests.forEach(r => {
        const hist: any[] = (r.settings as any)?.payment_history || [];
        hist.forEach(h => {
          const paidAt = h.paid_at || h.created_at || '';
          if (paidAt.startsWith(day) && (h.status === 'paid' || h.payment_status === 'paid')) {
            subscriptionRev += Number(h.amount || h.paid_amount || 0);
          }
        });
      });

      const dayOrders = allOrders.filter(o => o.created_at?.startsWith(day) && o.status === 'completed');
      const orderRev = dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      return {
        date: day.slice(5),
        revenue: subscriptionRev > 0 ? subscriptionRev : orderRev,
        orders: dayOrders.length
      };
    });

    const ordersTrend = days.map(day => {
      const dayOrders = allOrders.filter(o => o.created_at?.startsWith(day));
      return {
        date: day.slice(5),
        total: dayOrders.length,
        completed: dayOrders.filter(o => o.status === 'completed').length
      };
    });

    // Subscriptions breakdown
    let activeSubCount = 0;
    let trialCount = 0;
    let expiredCount = 0;
    let starterCount = 0;
    let proCount = 0;
    let premiumCount = 0;
    let enterpriseCount = 0;

    allRests.forEach(r => {
      const st = r.subscription_status;
      if (st === 'active') activeSubCount++;
      else if (st === 'trial') trialCount++;
      else expiredCount++;

      const p = (r.subscription_plan || 'starter').toLowerCase();
      if (p === 'starter') starterCount++;
      else if (p === 'pro') proCount++;
      else if (p === 'premium') premiumCount++;
      else enterpriseCount++;
    });

    // Real Churn calculation
    const totalTenants = allRests.length;
    const churnRate = totalTenants > 0 ? Math.round((expiredCount / totalTenants) * 100) : 0;

    // Trial Conversion calculation
    const convertedTenants = allRests.filter(r => {
      const hist = (r.settings as any)?.payment_history || [];
      return r.subscription_status === 'active' && hist.length > 0;
    }).length;
    const trialConversionRate = totalTenants > 0 ? Math.round((convertedTenants / totalTenants) * 100) : 0;

    // Renewals in next 30 days
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = allRests.filter(r => {
      if (!r.trial_ends_at || r.subscription_status !== 'active') return false;
      const exp = new Date(r.trial_ends_at);
      return exp > now && exp <= next30Days;
    }).length;

    return NextResponse.json({
      success: true,
      revenueTrend,
      ordersTrend,
      subscriptions: {
        active: activeSubCount,
        trial: trialCount,
        expired: expiredCount,
        breakdown: { starter: starterCount, pro: proCount, premium: premiumCount, enterprise: enterpriseCount }
      },
      metrics: {
        churnRate,
        trialConversionRate,
        upcomingRenewals,
        totalTenants
      }
    });
  } catch (err: any) {
    return handleApiError('Admin-Analytics', err, 'Failed to fetch analytics', 500);
  }
}
