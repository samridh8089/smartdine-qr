import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = (serviceKey && serviceKey !== '[SENSITIVE]')
  ? serviceKey
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

let _supabaseClient: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return _supabaseClient;
}

// In-memory server cache (10s TTL) for lightning-fast sub-10ms customer menu loads
interface CacheEntry {
  timestamp: number;
  restaurant: any;
}
const serverRestaurantCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10000;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();
    const id = searchParams.get('id')?.trim();

    if (!slug && !id) {
      return NextResponse.json({ error: 'slug or id parameter is required' }, { status: 400 });
    }

    const cacheKey = slug || id || '';
    const cached = serverRestaurantCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(
        { success: true, restaurant: cached.restaurant, fromCache: true },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
          },
        }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Query full restaurants table using service role / admin client
    let query = supabase
      .from('restaurants')
      .select('id, name, slug, logo_url, address, phone, subscription_plan, settings, created_at');

    if (slug) {
      query = query.eq('slug', slug);
    } else if (id) {
      query = query.eq('id', id);
    }

    let { data: rest, error } = await query.maybeSingle();

    // 2. If no row returned from restaurants, fall back to public_restaurants view
    if (!rest || error) {
      let pubQuery = supabase
        .from('public_restaurants')
        .select('*');

      if (slug) {
        pubQuery = pubQuery.eq('slug', slug);
      } else if (id) {
        pubQuery = pubQuery.eq('id', id);
      }

      const { data: pubRest } = await pubQuery.maybeSingle();
      if (pubRest) {
        rest = pubRest;
      }
    }

    if (!rest) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // 3. Resolve true logo (restaurant-level logo_url or settings logo) - NEVER fall back to cleverops /logo.png
    const resolvedLogo = rest.logo_url || (rest.settings as any)?.logo_url || (rest.settings as any)?.logo || null;

    const rawSettings = (rest.settings as any) || {};
    const sanitizedSettings = {
      ...rawSettings,
      require_customer_name: Boolean(rawSettings.require_customer_name),
      logo_url: resolvedLogo,
    };

    // Remove any sensitive gateway secrets if present
    delete (sanitizedSettings as any).razorpay_key_secret;
    delete (sanitizedSettings as any).stripe_secret_key;

    const safeRestaurant = {
      id: rest.id,
      name: rest.name,
      slug: rest.slug,
      logo_url: resolvedLogo,
      address: rest.address,
      phone: rest.phone,
      subscription_plan: rest.subscription_plan,
      settings: sanitizedSettings,
      created_at: rest.created_at,
    };

    // Populate server memory cache
    serverRestaurantCache.set(cacheKey, { timestamp: Date.now(), restaurant: safeRestaurant });
    if (rest.slug && rest.slug !== cacheKey) {
      serverRestaurantCache.set(rest.slug, { timestamp: Date.now(), restaurant: safeRestaurant });
    }
    if (rest.id && rest.id !== cacheKey) {
      serverRestaurantCache.set(rest.id, { timestamp: Date.now(), restaurant: safeRestaurant });
    }

    return NextResponse.json(
      { success: true, restaurant: safeRestaurant },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
        },
      }
    );
  } catch (err: any) {
    console.error('[api/customer/restaurant] unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
