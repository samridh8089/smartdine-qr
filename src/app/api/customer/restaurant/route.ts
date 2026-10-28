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

// In-memory server cache (15s TTL) for lightning-fast sub-10ms customer menu loads
interface CacheEntry {
  timestamp: number;
  restaurant: any;
  categories?: any[];
  menu_items?: any[];
  tables?: any[];
  plan?: any;
}
const serverRestaurantCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15000;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();
    const id = searchParams.get('id')?.trim();
    const includeMenu = searchParams.get('includeMenu') === 'true';

    if (!slug && !id) {
      return NextResponse.json({ error: 'slug or id parameter is required' }, { status: 400 });
    }

    const cacheKey = slug || id || '';
    const cached = serverRestaurantCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      if (!includeMenu || (cached.categories && cached.menu_items)) {
        return NextResponse.json(
          {
            success: true,
            restaurant: cached.restaurant,
            categories: cached.categories,
            menu_items: cached.menu_items,
            tables: cached.tables,
            plan: cached.plan,
            fromCache: true,
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
            },
          }
        );
      }
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

    let categories: any[] = [];
    let menuItems: any[] = [];
    let tables: any[] = [];
    let planData: any = null;

    if (includeMenu) {
      const planId = (rest.subscription_plan || 'starter').toLowerCase();
      const [catsRes, itemsRes, tablesRes, planRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', rest.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', rest.id),
        supabase
          .from('tables')
          .select('id, name, restaurant_id')
          .eq('restaurant_id', rest.id),
        supabase
          .from('pricing_plans')
          .select('*')
          .eq('id', planId)
          .maybeSingle(),
      ]);

      categories = catsRes.data || [];
      const rawItems = itemsRes.data || [];
      tables = (tablesRes.data || []).map((t: any) => ({
        ...t,
        qr_enabled: true,
      }));
      planData = planRes.data || null;

      // Fetch variants for menu items
      const itemIds = rawItems.map((i: any) => i.id);
      if (itemIds.length > 0) {
        try {
          const { data: varData } = await supabase
            .from('menu_item_variants')
            .select('*')
            .in('menu_item_id', itemIds)
            .order('display_order', { ascending: true });

          if (varData && varData.length > 0) {
            const varMap: Record<string, any[]> = {};
            varData.forEach((v: any) => {
              if (!varMap[v.menu_item_id]) varMap[v.menu_item_id] = [];
              varMap[v.menu_item_id].push({
                id: v.id,
                menu_item_id: v.menu_item_id,
                name: v.name,
                price: Number(v.price),
                display_order: v.display_order || 0,
                is_available: v.is_available !== false,
              });
            });

            menuItems = rawItems.map((item: any) => {
              const itemVars = varMap[item.id] || item.variants || [];
              return {
                ...item,
                has_variants: Boolean(item.has_variants || itemVars.length > 0),
                variants: itemVars,
              };
            });
          } else {
            menuItems = rawItems;
          }
        } catch (_) {
          menuItems = rawItems;
        }
      } else {
        menuItems = rawItems;
      }
    }

    // Populate server memory cache
    const cacheEntry: CacheEntry = {
      timestamp: Date.now(),
      restaurant: safeRestaurant,
      categories: includeMenu ? categories : cached?.categories,
      menu_items: includeMenu ? menuItems : cached?.menu_items,
      tables: includeMenu ? tables : cached?.tables,
      plan: includeMenu ? planData : cached?.plan,
    };

    serverRestaurantCache.set(cacheKey, cacheEntry);
    if (rest.slug && rest.slug !== cacheKey) {
      serverRestaurantCache.set(rest.slug, cacheEntry);
    }
    if (rest.id && rest.id !== cacheKey) {
      serverRestaurantCache.set(rest.id, cacheEntry);
    }

    const responsePayload: any = {
      success: true,
      restaurant: safeRestaurant,
    };
    if (includeMenu) {
      responsePayload.categories = categories;
      responsePayload.menu_items = menuItems;
      responsePayload.tables = tables;
      responsePayload.plan = planData;
    }

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
      },
    });
  } catch (err: any) {
    console.error('[api/customer/restaurant] unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
