import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('=== POPULATING REAL INVENTORY & RECIPES ===\n');

  // 1. INVENTORY ITEMS DEFINITIONS
  const inventoryItemsData = [
    { name: 'Paneer', current_stock: 10, unit: 'kg', cost_per_unit: 280, minimum_stock: 2 },
    { name: 'Tomato', current_stock: 25, unit: 'kg', cost_per_unit: 30, minimum_stock: 5 },
    { name: 'Onion', current_stock: 30, unit: 'kg', cost_per_unit: 25, minimum_stock: 5 },
    { name: 'Butter', current_stock: 8, unit: 'kg', cost_per_unit: 450, minimum_stock: 1.5 },
    { name: 'Fresh Cream', current_stock: 5, unit: 'l', cost_per_unit: 200, minimum_stock: 1 },
    { name: 'Cooking Oil', current_stock: 20, unit: 'l', cost_per_unit: 140, minimum_stock: 3 },
    { name: 'Rice', current_stock: 50, unit: 'kg', cost_per_unit: 60, minimum_stock: 10 },
    { name: 'Atta', current_stock: 40, unit: 'kg', cost_per_unit: 35, minimum_stock: 8 },
    { name: 'Cheese', current_stock: 5, unit: 'kg', cost_per_unit: 480, minimum_stock: 1 },
    { name: 'Soft Drink Stock', current_stock: 100, unit: 'bottle', cost_per_unit: 25, minimum_stock: 20 }
  ];

  const itemMap = new Map();

  for (const item of inventoryItemsData) {
    // Check if item exists
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('name', item.name)
      .maybeSingle();

    let itemId = existing?.id;

    if (!existing) {
      const { data: inserted, error } = await supabase
        .from('inventory_items')
        .insert({
          restaurant_id: restaurantId,
          name: item.name,
          current_stock: item.current_stock,
          opening_stock: item.current_stock,
          unit: item.unit,
          cost_per_unit: item.cost_per_unit,
          minimum_stock: item.minimum_stock,
          is_active: true,
          reserved_stock: 0
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating inventory item ${item.name}:`, error.message);
        continue;
      }

      itemId = inserted.id;

      // Log opening stock transaction
      await supabase.from('inventory_transactions').insert({
        restaurant_id: restaurantId,
        inventory_item_id: inserted.id,
        quantity: item.current_stock,
        unit: item.unit,
        before_stock: 0,
        after_stock: item.current_stock,
        transaction_type: 'OPENING_STOCK',
        user_name: 'Owner',
        notes: 'Initial production opening stock setup'
      });

      console.log(`✓ Created Item: ${item.name} (${item.current_stock} ${item.unit} @ ₹${item.cost_per_unit}/${item.unit}, Min: ${item.minimum_stock})`);
    } else {
      console.log(`Item already exists: ${item.name} (ID: ${existing.id})`);
    }

    itemMap.set(item.name, itemId);
  }

  // 2. RECIPE MAPPING
  console.log('\n--- MAPPING RECIPES TO MENU ITEMS ---');

  // Fetch menu items and variants
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, variants:menu_item_variants(*)')
    .eq('restaurant_id', restaurantId);

  const getMenuItem = (name) => menuItems.find(m => m.name.toLowerCase() === name.toLowerCase());

  // Helper to create or update recipe
  async function mapRecipe(dishName, variantName, servingSize, steps, ingredients) {
    const dish = getMenuItem(dishName);
    if (!dish) {
      console.error(`Menu item "${dishName}" not found!`);
      return;
    }

    let variantId = null;
    if (variantName && dish.variants) {
      const v = dish.variants.find(va => va.name.toLowerCase() === variantName.toLowerCase());
      if (v) variantId = v.id;
    }

    // Check existing recipe
    let query = supabase.from('inventory_recipes').select('*').eq('restaurant_id', restaurantId).eq('menu_item_id', dish.id);
    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }
    const { data: existingRec } = await query.maybeSingle();

    let recipeId = existingRec?.id;
    if (!existingRec) {
      const { data: insRec, error: recErr } = await supabase
        .from('inventory_recipes')
        .insert({
          restaurant_id: restaurantId,
          menu_item_id: dish.id,
          variant_id: variantId,
          serving_size: servingSize,
          preparation_steps: steps
        })
        .select()
        .single();

      if (recErr) {
        console.error(`Error creating recipe for ${dishName} ${variantName || ''}:`, recErr.message);
        return;
      }
      recipeId = insRec.id;
    }

    // Delete old recipe ingredients and re-insert
    await supabase.from('inventory_recipe_ingredients').delete().eq('recipe_id', recipeId);

    const ingsToInsert = ingredients.map(i => ({
      recipe_id: recipeId,
      inventory_item_id: itemMap.get(i.name),
      quantity: i.qty,
      unit: i.unit
    })).filter(i => Boolean(i.inventory_item_id));

    const { error: ingErr } = await supabase.from('inventory_recipe_ingredients').insert(ingsToInsert);
    if (ingErr) {
      console.error(`Error saving ingredients for ${dishName}:`, ingErr.message);
    } else {
      console.log(`✓ Mapped Recipe: ${dishName} [${variantName || 'Regular'}] with ${ingsToInsert.length} ingredients`);
    }
  }

  // Paneer Butter Masala (Full)
  // Paneer 250g, Tomato 120g, Butter 20g, Cream 30ml, Oil 15ml
  await mapRecipe('Paneer Butter Masala', 'Full', 'Full Portion (1-2 guests)', '1. Sauté tomatoes and spices in oil and butter.\n2. Add cream and simmer.\n3. Add paneer cubes and cook for 5 minutes.', [
    { name: 'Paneer', qty: 250, unit: 'gram' },
    { name: 'Tomato', qty: 120, unit: 'gram' },
    { name: 'Butter', qty: 20, unit: 'gram' },
    { name: 'Fresh Cream', qty: 30, unit: 'ml' },
    { name: 'Cooking Oil', qty: 15, unit: 'ml' }
  ]);

  // Paneer Butter Masala (Half)
  // Paneer 125g, Tomato 60g, Butter 10g, Cream 15ml, Oil 7.5ml
  await mapRecipe('Paneer Butter Masala', 'Half', 'Half Portion (1 guest)', '1. Sauté tomatoes in oil.\n2. Add cream & butter.\n3. Simmer paneer cubes.', [
    { name: 'Paneer', qty: 125, unit: 'gram' },
    { name: 'Tomato', qty: 60, unit: 'gram' },
    { name: 'Butter', qty: 10, unit: 'gram' },
    { name: 'Fresh Cream', qty: 15, unit: 'ml' },
    { name: 'Cooking Oil', qty: 7.5, unit: 'ml' }
  ]);

  // Dal Makhani (Full)
  await mapRecipe('Dal Makhani', 'Full', 'Full Portion', '1. Simmer soaked lentils overnight.\n2. Add fresh tomato puree, butter and cream.\n3. Slow cook until rich & creamy.', [
    { name: 'Tomato', qty: 80, unit: 'gram' },
    { name: 'Butter', qty: 30, unit: 'gram' },
    { name: 'Fresh Cream', qty: 25, unit: 'ml' },
    { name: 'Onion', qty: 50, unit: 'gram' },
    { name: 'Cooking Oil', qty: 10, unit: 'ml' }
  ]);

  // Dal Makhani (Half)
  await mapRecipe('Dal Makhani', 'Half', 'Half Portion', '1. Simmer lentils with butter & cream.', [
    { name: 'Tomato', qty: 40, unit: 'gram' },
    { name: 'Butter', qty: 15, unit: 'gram' },
    { name: 'Fresh Cream', qty: 12.5, unit: 'ml' },
    { name: 'Onion', qty: 25, unit: 'gram' },
    { name: 'Cooking Oil', qty: 5, unit: 'ml' }
  ]);

  // Veg Biryani
  await mapRecipe('Veg Biryani', null, '1 Handi', '1. Parboil basmati rice with whole spices.\n2. Layer with browned onions and seasonal vegetables.\n3. Dum cook on low heat.', [
    { name: 'Rice', qty: 150, unit: 'gram' },
    { name: 'Onion', qty: 60, unit: 'gram' },
    { name: 'Cooking Oil', qty: 20, unit: 'ml' },
    { name: 'Tomato', qty: 40, unit: 'gram' }
  ]);

  // Butter Naan
  await mapRecipe('Butter Naan', null, '1 Piece', '1. Roll dough.\n2. Slap inside tandoor oven.\n3. Brush generously with melted butter.', [
    { name: 'Atta', qty: 100, unit: 'gram' },
    { name: 'Butter', qty: 15, unit: 'gram' }
  ]);

  console.log('\n=== REAL INVENTORY & RECIPES SETUP COMPLETE ===');
}

main().catch(console.error);
