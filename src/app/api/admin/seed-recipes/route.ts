import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SEED_SECRET = 'foody_hub_seed_2026';
const RESTAURANT_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

// Inventory item IDs (confirmed from production DB)
const INV = {
  pizzaBase:  'b53fbd5f-7118-4d5c-a14f-db50d2048165',
  cheese:     '1c9c9f52-913b-4f2c-8c0e-958fe3921216',
  pizzaSauce: 'fe194656-faf0-4700-a513-5421c19f764b',
  burgerBun:  'c3a64bc8-a194-4341-9cb7-00dc96812bb8',
  patty:      'da16887c-f9c0-41a0-91d6-9568999440f3',
  lettuce:    '1e319311-711e-4a54-bf1c-4350b0a55ff8',
  tomato:     '155d0632-6075-4798-bde1-65d420ca9715',
  fries:      '3a794678-3a5a-439d-b855-3b65bee6bc46',
  coke:       '6d68a1d8-a3d0-48bf-b13a-008b24c4246a',
  brownieMix: '3a2031a3-aa16-48be-b495-d7834288d94a',
};

// Menu item IDs (confirmed from production DB)
const MENU = {
  margheritaPizza:  'd44e96e5-8168-44c9-8186-6d3960810fed',
  farmhousePizza:   '48168f45-2e7a-4bb0-90d5-85ca15776927',
  paneerTikkaPizza: '5c269d08-2967-4833-a8ef-f6c370bfcd5d',
  vegBurger:        '38f6c757-7769-4f52-82bc-eea50d319396',
  cheeseBurger:     '8096b824-efcf-46dd-80c4-4a88b0f1124b',
  whiteSaucePasta:  '5062499b-d34c-4bbe-a619-f2c1fce510fa',
  redSaucePasta:    '258baee8-155b-4369-b6e6-d3d111435eed',
  coke:             '4808ce74-415d-4ca6-9878-27f0eb4b6063',
  lemonSoda:        '4d4cc188-f891-4ad5-8cad-c5a1763284d4',
  brownie:          'cb324256-ae4e-4d37-a47c-d92e67e7fdc9',
};

// Recipe definitions: [menuItemId, ingredients: [{invId, qty, unit}]]
const RECIPES = [
  {
    menuItemId: MENU.margheritaPizza,
    name: 'Margherita Pizza',
    ingredients: [
      { invId: INV.pizzaBase,  qty: 1,   unit: 'piece' },
      { invId: INV.cheese,     qty: 150, unit: 'gram' },
      { invId: INV.pizzaSauce, qty: 50,  unit: 'ml' },
    ],
  },
  {
    menuItemId: MENU.farmhousePizza,
    name: 'Farmhouse Pizza',
    ingredients: [
      { invId: INV.pizzaBase,  qty: 1,   unit: 'piece' },
      { invId: INV.cheese,     qty: 180, unit: 'gram' },
      { invId: INV.pizzaSauce, qty: 50,  unit: 'ml' },
    ],
  },
  {
    menuItemId: MENU.paneerTikkaPizza,
    name: 'Paneer Tikka Pizza',
    ingredients: [
      { invId: INV.pizzaBase,  qty: 1,   unit: 'piece' },
      { invId: INV.cheese,     qty: 160, unit: 'gram' },
      { invId: INV.pizzaSauce, qty: 50,  unit: 'ml' },
    ],
  },
  {
    menuItemId: MENU.vegBurger,
    name: 'Veg Burger',
    ingredients: [
      { invId: INV.burgerBun, qty: 1,  unit: 'piece' },
      { invId: INV.patty,     qty: 1,  unit: 'piece' },
      { invId: INV.cheese,    qty: 20, unit: 'gram' },
      { invId: INV.lettuce,   qty: 10, unit: 'gram' },
      { invId: INV.tomato,    qty: 20, unit: 'gram' },
    ],
  },
  {
    menuItemId: MENU.cheeseBurger,
    name: 'Cheese Burger',
    ingredients: [
      { invId: INV.burgerBun, qty: 1,  unit: 'piece' },
      { invId: INV.patty,     qty: 1,  unit: 'piece' },
      { invId: INV.cheese,    qty: 40, unit: 'gram' },
      { invId: INV.lettuce,   qty: 10, unit: 'gram' },
      { invId: INV.tomato,    qty: 15, unit: 'gram' },
    ],
  },
  {
    menuItemId: MENU.whiteSaucePasta,
    name: 'White Sauce Pasta',
    ingredients: [
      { invId: INV.cheese,    qty: 60,  unit: 'gram' },
    ],
  },
  {
    menuItemId: MENU.redSaucePasta,
    name: 'Red Sauce Pasta',
    ingredients: [
      { invId: INV.tomato,    qty: 80,  unit: 'gram' },
      { invId: INV.cheese,    qty: 30,  unit: 'gram' },
    ],
  },
  {
    menuItemId: MENU.coke,
    name: 'Coke',
    ingredients: [
      { invId: INV.coke, qty: 1, unit: 'bottle' },
    ],
  },
  {
    menuItemId: MENU.lemonSoda,
    name: 'Lemon Soda',
    ingredients: [],  // No tracked ingredient
  },
  {
    menuItemId: MENU.brownie,
    name: 'Brownie',
    ingredients: [
      { invId: INV.brownieMix, qty: 80, unit: 'gram' },
    ],
  },
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const results: any[] = [];

    for (const recipe of RECIPES) {
      // Skip items with no ingredients
      if (recipe.ingredients.length === 0) {
        results.push({ name: recipe.name, status: 'skipped (no ingredients)' });
        continue;
      }

      // Upsert recipe (UNIQUE on restaurant_id + menu_item_id)
      const { data: existingRecipe } = await supabaseAdmin
        .from('inventory_recipes')
        .select('id')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('menu_item_id', recipe.menuItemId)
        .maybeSingle();

      let recipeId: string;

      if (existingRecipe) {
        recipeId = existingRecipe.id;
        // Delete old ingredients to re-seed cleanly
        await supabaseAdmin
          .from('inventory_recipe_ingredients')
          .delete()
          .eq('recipe_id', recipeId);
        results.push({ name: recipe.name, status: 'updated (re-seeded ingredients)', recipeId });
      } else {
        const { data: newRecipe, error: recipeErr } = await supabaseAdmin
          .from('inventory_recipes')
          .insert({
            restaurant_id: RESTAURANT_ID,
            menu_item_id: recipe.menuItemId,
            serving_size: 1,
            notes: `E2E audit seed — ${recipe.name}`,
          })
          .select('id')
          .single();

        if (recipeErr) {
          results.push({ name: recipe.name, status: 'error: ' + recipeErr.message });
          continue;
        }
        recipeId = newRecipe.id;
        results.push({ name: recipe.name, status: 'created', recipeId });
      }

      // Insert ingredients
      for (const ing of recipe.ingredients) {
        const { error: ingErr } = await supabaseAdmin
          .from('inventory_recipe_ingredients')
          .insert({
            recipe_id: recipeId,
            inventory_item_id: ing.invId,
            quantity: ing.qty,
            unit: ing.unit,
          });
        if (ingErr) {
          results.push({ name: recipe.name + ' ingredient', status: 'error: ' + ingErr.message });
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
