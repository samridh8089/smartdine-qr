import { NextResponse } from 'next/server';
import { consumeAICreditForRestaurant, getAIUsageForRestaurant } from '@/lib/entitlements';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const featureKey = searchParams.get('featureKey') || 'ai_menu_analysis';

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const usage = await getAIUsageForRestaurant(restaurantId, featureKey);
    return NextResponse.json({
      success: true,
      used: usage.used,
      limit: usage.limit,
      remaining: usage.remaining,
      maxItemsPerRequest: usage.maxItemsPerRequest,
      maxRequestsPerMonth: usage.maxRequestsPerMonth
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch AI usage' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, featureKey, itemCount, consume } = body;

    if (!restaurantId || !featureKey) {
      return NextResponse.json({ error: 'Restaurant ID and feature key required' }, { status: 400 });
    }

    if (consume && itemCount > 0) {
      const res = await consumeAICreditForRestaurant(restaurantId, featureKey, itemCount);
      if (!res.allowed) {
        return NextResponse.json({
          allowed: false,
          used: res.used,
          limit: res.limit,
          remaining: res.remaining,
          error: res.message
        }, { status: 403 });
      }

      return NextResponse.json({
        allowed: true,
        used: res.used,
        limit: res.limit,
        remaining: res.remaining
      });
    } else {
      const usage = await getAIUsageForRestaurant(restaurantId, featureKey);
      return NextResponse.json({
        allowed: usage.remaining === null || usage.remaining > 0,
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
        maxItemsPerRequest: usage.maxItemsPerRequest,
        maxRequestsPerMonth: usage.maxRequestsPerMonth
      });
    }
  } catch (error: any) {
    return NextResponse.json({ allowed: true, error: error?.message }, { status: 500 });
  }
}
