import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SEED_SECRET = 'foody_hub_seed_2026';
const RESTAURANT_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // ── Phase 1: Categories ──────────────────────────────────────────────
    const categoryNames = ['Pizza', 'Burgers', 'Pasta', 'Beverages', 'Desserts'];
    const categoryResults: Record<string, string> = {};

    for (let i = 0; i < categoryNames.length; i++) {
      const name = categoryNames[i];
      // Upsert by name
      const { data: existing } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('name', name)
        .maybeSingle();

      if (existing) {
        categoryResults[name] = existing.id;
      } else {
        const { data, error } = await supabaseAdmin
          .from('categories')
          .insert({ restaurant_id: RESTAURANT_ID, name, sort_order: i + 1 })
          .select('id')
          .single();
        if (error) return NextResponse.json({ error: `Category ${name}: ${error.message}` }, { status: 500 });
        categoryResults[name] = data.id;
      }
    }

    // ── Phase 1: Menu Items ──────────────────────────────────────────────
    const menuItems = [
      {
        name: 'Margherita Pizza',
        category: 'Pizza',
        price: 299,
        is_veg: true,
        description: 'Classic tomato sauce with fresh mozzarella and basil on a crispy crust.',
        image_url: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800&q=80',
      },
      {
        name: 'Farmhouse Pizza',
        category: 'Pizza',
        price: 399,
        is_veg: true,
        description: 'Loaded with capsicum, onion, mushroom, paneer and olives.',
        image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
      },
      {
        name: 'Paneer Tikka Pizza',
        category: 'Pizza',
        price: 379,
        is_veg: true,
        description: 'Smoky paneer tikka with bell peppers on a tangy masala base.',
        image_url: 'https://images.unsplash.com/photo-1593504049359-74330189a345?w=800&q=80',
      },
      {
        name: 'Veg Burger',
        category: 'Burgers',
        price: 179,
        is_veg: true,
        description: 'Crispy veggie patty with lettuce, tomato and house mayo in a toasted bun.',
        image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
      },
      {
        name: 'Cheese Burger',
        category: 'Burgers',
        price: 229,
        is_veg: true,
        description: 'Double cheese slice, jalapeños, and caramelised onion on a sesame bun.',
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      },
      {
        name: 'White Sauce Pasta',
        category: 'Pasta',
        price: 249,
        is_veg: true,
        description: 'Penne in creamy béchamel with garlic butter and parmesan shavings.',
        image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80',
      },
      {
        name: 'Red Sauce Pasta',
        category: 'Pasta',
        price: 239,
        is_veg: true,
        description: 'Penne in slow-cooked tomato arrabbiata with fresh herbs.',
        image_url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&q=80',
      },
      {
        name: 'Coke',
        category: 'Beverages',
        price: 49,
        is_veg: true,
        description: 'Ice-cold Coca-Cola 300 ml.',
        image_url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&q=80',
      },
      {
        name: 'Lemon Soda',
        category: 'Beverages',
        price: 59,
        is_veg: true,
        description: 'Fresh lemon with sparkling soda, mint, and a pinch of chat masala.',
        image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
      },
      {
        name: 'Brownie',
        category: 'Desserts',
        price: 119,
        is_veg: true,
        description: 'Warm chocolate fudge brownie served with a scoop of vanilla ice cream.',
        image_url: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=800&q=80',
      },
    ];

    const menuItemResults: Array<{ id: string; name: string }> = [];

    for (const item of menuItems) {
      const categoryId = categoryResults[item.category];
      if (!categoryId) continue;

      const { data: existing } = await supabaseAdmin
        .from('menu_items')
        .select('id')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('name', item.name)
        .maybeSingle();

      if (existing) {
        menuItemResults.push({ id: existing.id, name: item.name });
      } else {
        const { data, error } = await supabaseAdmin
          .from('menu_items')
          .insert({
            restaurant_id: RESTAURANT_ID,
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image_url,
            is_available: true,
            is_veg: item.is_veg,
          })
          .select('id')
          .single();
        if (error) return NextResponse.json({ error: `MenuItem ${item.name}: ${error.message}` }, { status: 500 });
        menuItemResults.push({ id: data.id, name: item.name });
      }
    }

    return NextResponse.json({
      success: true,
      categories: categoryResults,
      menuItems: menuItemResults,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
