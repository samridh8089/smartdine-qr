import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, menuStockMap: {} });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Safely query active inventory items
    const { data: items } = await supabaseAdmin
      .from('inventory_items')
      .select('id, current_stock, minimum_stock, is_active')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // Safely query recipes with ingredients
    const { data: recipes } = await supabaseAdmin
      .from('inventory_recipes')
      .select('id, menu_item_id, inventory_recipe_ingredients(inventory_item_id, quantity)')
      .eq('restaurant_id', restaurantId);

    const menuStockMap: Record<string, { inStock: boolean; maxPortions: number }> = {};

    if (items && recipes) {
      const itemStockMap = new Map<string, number>();
      items.forEach(it => {
        itemStockMap.set(it.id, Math.max(0, Number(it.current_stock) || 0));
      });

      recipes.forEach((rec: any) => {
        const ingredients = rec.inventory_recipe_ingredients || [];
        if (ingredients.length === 0) {
          // If no BOM, assume in stock
          menuStockMap[rec.menu_item_id] = { inStock: true, maxPortions: 999 };
          return;
        }

        let maxPortions = 9999;
        let inStock = true;

        for (const ing of ingredients) {
          const available = itemStockMap.get(ing.inventory_item_id) ?? 0;
          const required = Number(ing.quantity) || 0;
          if (required > 0) {
            const possible = Math.floor(available / required);
            if (possible < maxPortions) maxPortions = possible;
            if (possible <= 0) inStock = false;
          }
        }

        menuStockMap[rec.menu_item_id] = {
          inStock: inStock && maxPortions > 0,
          maxPortions: Math.max(0, maxPortions)
        };
      });
    }

    return NextResponse.json(
      { success: true, menuStockMap },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, menuStockMap: {}, error: err.message });
  }
}
