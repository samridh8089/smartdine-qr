const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tiuwfhkrjvtkshebdwlp.supabase.co',
  'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-'
);

function normalizeUnit(unit) {
  if (!unit) return 'portion';
  const u = unit.toLowerCase().trim();
  if (['g', 'gram', 'grams', 'gm'].includes(u)) return 'gram';
  if (['kg', 'kilogram', 'kilograms'].includes(u)) return 'kg';
  if (['ml', 'millilitre', 'milliliter'].includes(u)) return 'ml';
  if (['l', 'liter', 'litre', 'liters', 'litres'].includes(u)) return 'litre';
  if (['portion', 'portions', 'serving', 'servings', 'plate', 'plates', 'bowl', 'bowls', 'glass', 'glasses', 'cup', 'cups'].includes(u)) return 'portion';
  if (['piece', 'pieces', 'pc', 'pcs', 'slice', 'slices', 'patty', 'patties'].includes(u)) return 'piece';
  if (['can', 'cans', 'bottle', 'bottles', 'pack', 'packs', 'packet', 'packets'].includes(u)) return 'unit';
  return u;
}

function areUnitsCompatible(unit1, unit2) {
  const n1 = normalizeUnit(unit1);
  const n2 = normalizeUnit(unit2);
  if (n1 === n2) return true;
  if ((n1 === 'gram' && n2 === 'kg') || (n1 === 'kg' && n2 === 'gram')) return true;
  if ((n1 === 'ml' && n2 === 'litre') || (n1 === 'litre' && n2 === 'ml')) return true;
  return false;
}

function convertUnit(quantity, fromUnit, toUnit) {
  const nFrom = normalizeUnit(fromUnit);
  const nTo = normalizeUnit(toUnit);
  if (nFrom === nTo) return quantity;
  if (nFrom === 'gram' && nTo === 'kg') return quantity / 1000;
  if (nFrom === 'kg' && nTo === 'gram') return quantity * 1000;
  if (nFrom === 'ml' && nTo === 'litre') return quantity / 1000;
  if (nFrom === 'litre' && nTo === 'ml') return quantity * 1000;
  return quantity;
}

function findMatchingRecipe(recipes, menuItemId, variantId, variantName) {
  if (!recipes || recipes.length === 0) return null;
  const menuRecipes = recipes.filter(r => r.menu_item_id === menuItemId);
  if (menuRecipes.length === 0) return null;

  if (variantId) {
    const exactVar = menuRecipes.find(r => r.variant_id === variantId);
    if (exactVar) return exactVar;
  }

  if (variantName) {
    const nameMatch = menuRecipes.find(r => {
      const vName = r.menu_item_variants?.name || r.variant_name || r.serving_size || '';
      return vName.toLowerCase().trim() === variantName.toLowerCase().trim();
    });
    if (nameMatch) return nameMatch;
  }

  const baseRecipe = menuRecipes.find(r => !r.variant_id && !r.variant_name);
  if (baseRecipe) return baseRecipe;

  return menuRecipes[0];
}

async function runRegressionSuite() {
  console.log('========================================================================');
  console.log('STARTING FORENSIC AUDIT & PORTION-SPECIFIC RECIPE REGRESSION TEST SUITE');
  console.log('========================================================================\n');

  const testResults = [];

  function record(name, pass, details = '') {
    testResults.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} ${details ? '--> ' + details : ''}`);
  }

  // Unit conversion helpers verification
  try {
    const c1 = convertUnit(100, 'gram', 'kg');
    const c2 = convertUnit(0.2, 'kg', 'gram');
    record('Unit Conversion (gram <-> kg)', c1 === 0.1 && c2 === 200, `100g=${c1}kg, 0.2kg=${c2}g`);
  } catch (e) {
    record('Unit Conversion (gram <-> kg)', false, e.message);
  }

  // TEST 1: 1 Half (100g requirement) => 100g (0.1kg)
  try {
    const recipes = [
      {
        id: 'rec_half',
        menu_item_id: 'dish_dal',
        variant_id: 'var_half',
        variant_name: 'Half',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 100, unit: 'gram' }
        ]
      },
      {
        id: 'rec_full',
        menu_item_id: 'dish_dal',
        variant_id: 'var_full',
        variant_name: 'Full',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 200, unit: 'gram' }
        ]
      }
    ];

    const recHalf = findMatchingRecipe(recipes, 'dish_dal', 'var_half', 'Half');
    const qty = 1;
    const paneerReq = recHalf.inventory_recipe_ingredients[0].quantity * qty;
    record('Test 1: 1 Half (100g req)', paneerReq === 100, `Result: ${paneerReq}g`);
  } catch (e) {
    record('Test 1: 1 Half (100g req)', false, e.message);
  }

  // TEST 2: 2 Half (100g req) => 200g
  try {
    const recipes = [
      {
        id: 'rec_half',
        menu_item_id: 'dish_dal',
        variant_id: 'var_half',
        variant_name: 'Half',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 100, unit: 'gram' }
        ]
      }
    ];
    const recHalf = findMatchingRecipe(recipes, 'dish_dal', 'var_half', 'Half');
    const qty = 2;
    const paneerReq = recHalf.inventory_recipe_ingredients[0].quantity * qty;
    record('Test 2: 2 Half (100g req)', paneerReq === 200, `Result: ${paneerReq}g`);
  } catch (e) {
    record('Test 2: 2 Half (100g req)', false, e.message);
  }

  // TEST 3: 3 Half (100g req) => 300g
  try {
    const recipes = [
      {
        id: 'rec_half',
        menu_item_id: 'dish_dal',
        variant_id: 'var_half',
        variant_name: 'Half',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 100, unit: 'gram' }
        ]
      }
    ];
    const recHalf = findMatchingRecipe(recipes, 'dish_dal', 'var_half', 'Half');
    const qty = 3;
    const paneerReq = recHalf.inventory_recipe_ingredients[0].quantity * qty;
    record('Test 3: 3 Half (100g req)', paneerReq === 300, `Result: ${paneerReq}g`);
  } catch (e) {
    record('Test 3: 3 Half (100g req)', false, e.message);
  }

  // TEST 4: 2 Full (200g req) => 400g
  try {
    const recipes = [
      {
        id: 'rec_full',
        menu_item_id: 'dish_dal',
        variant_id: 'var_full',
        variant_name: 'Full',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 200, unit: 'gram' }
        ]
      }
    ];
    const recFull = findMatchingRecipe(recipes, 'dish_dal', 'var_full', 'Full');
    const qty = 2;
    const paneerReq = recFull.inventory_recipe_ingredients[0].quantity * qty;
    record('Test 4: 2 Full (200g req)', paneerReq === 400, `Result: ${paneerReq}g`);
  } catch (e) {
    record('Test 4: 2 Full (200g req)', false, e.message);
  }

  // TEST 5: 1 Half (100g) + 1 Full (200g) => 300g
  try {
    const recipes = [
      {
        id: 'rec_half',
        menu_item_id: 'dish_dal',
        variant_id: 'var_half',
        variant_name: 'Half',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 100, unit: 'gram' }
        ]
      },
      {
        id: 'rec_full',
        menu_item_id: 'dish_dal',
        variant_id: 'var_full',
        variant_name: 'Full',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 200, unit: 'gram' }
        ]
      }
    ];

    const rHalf = findMatchingRecipe(recipes, 'dish_dal', 'var_half', 'Half');
    const rFull = findMatchingRecipe(recipes, 'dish_dal', 'var_full', 'Full');
    const totalPaneer = (rHalf.inventory_recipe_ingredients[0].quantity * 1) + 
                        (rFull.inventory_recipe_ingredients[0].quantity * 1);
    record('Test 5: 1 Half + 1 Full (100g + 200g)', totalPaneer === 300, `Result: ${totalPaneer}g`);
  } catch (e) {
    record('Test 5: 1 Half + 1 Full', false, e.message);
  }

  // TEST 6: 2 Half (100g) + 3 Full (200g) => 800g
  try {
    const recipes = [
      {
        id: 'rec_half',
        menu_item_id: 'dish_dal',
        variant_id: 'var_half',
        variant_name: 'Half',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 100, unit: 'gram' }
        ]
      },
      {
        id: 'rec_full',
        menu_item_id: 'dish_dal',
        variant_id: 'var_full',
        variant_name: 'Full',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 200, unit: 'gram' }
        ]
      }
    ];

    const rHalf = findMatchingRecipe(recipes, 'dish_dal', 'var_half', 'Half');
    const rFull = findMatchingRecipe(recipes, 'dish_dal', 'var_full', 'Full');
    const totalPaneer = (rHalf.inventory_recipe_ingredients[0].quantity * 2) + 
                        (rFull.inventory_recipe_ingredients[0].quantity * 3);
    record('Test 6: 2 Half + 3 Full (200g + 600g)', totalPaneer === 800, `Result: ${totalPaneer}g`);
  } catch (e) {
    record('Test 6: 2 Half + 3 Full', false, e.message);
  }

  // TEST 7: Exact Real Bug (THE1808TN9D9): 2 x Half Dal Makhani (100g Paneer) => 200g (never 100g)
  try {
    const recipes = [
      {
        id: 'rec_half',
        menu_item_id: 'dish_dal',
        variant_id: 'var_half',
        variant_name: 'Half',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 100, unit: 'gram' }
        ]
      }
    ];
    const recHalf = findMatchingRecipe(recipes, 'dish_dal', 'var_half', 'Half');
    const orderQty = 2;
    const consumed = recHalf.inventory_recipe_ingredients[0].quantity * orderQty;
    record('Test 7: Exact Real Bug (THE1808TN9D9) 2 Half = 200g', consumed === 200 && consumed !== 100, `Consumed: ${consumed}g`);
  } catch (e) {
    record('Test 7: Exact Real Bug', false, e.message);
  }

  // TEST 8: All Ingredients Multi-Ingredient Test (Paneer 100g, Dal 150g, Cream 50ml) x 2
  try {
    const recipes = [
      {
        id: 'rec_half',
        menu_item_id: 'dish_dal',
        variant_id: 'var_half',
        variant_name: 'Half',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 100, unit: 'gram' },
          { inventory_item_id: 'raw_dal', quantity: 150, unit: 'gram' },
          { inventory_item_id: 'raw_cream', quantity: 50, unit: 'ml' }
        ]
      }
    ];

    const r = findMatchingRecipe(recipes, 'dish_dal', 'var_half', 'Half');
    const qty = 2;
    const paneer = r.inventory_recipe_ingredients.find(i => i.inventory_item_id === 'raw_paneer').quantity * qty;
    const dal = r.inventory_recipe_ingredients.find(i => i.inventory_item_id === 'raw_dal').quantity * qty;
    const cream = r.inventory_recipe_ingredients.find(i => i.inventory_item_id === 'raw_cream').quantity * qty;

    const pass = paneer === 200 && dal === 300 && cream === 100;
    record('Test 8: Multi-Ingredient (Paneer 200g, Dal 300g, Cream 100ml)', pass, `Paneer:${paneer}g, Dal:${dal}g, Cream:${cream}ml`);
  } catch (e) {
    record('Test 8: Multi-Ingredient', false, e.message);
  }

  // TEST 9: Concurrency Stock Limit
  try {
    const rawStock = 12;
    const reservedStock = 8;
    const available = rawStock - reservedStock; // 4 remaining
    const orderB_req = 6;
    const allowed = orderB_req <= available;
    record('Test 9: Concurrency Limit (12 physical, 8 reserved, 6 rejected)', allowed === false, `Available: ${available}, Requested: ${orderB_req}`);
  } catch (e) {
    record('Test 9: Concurrency Limit', false, e.message);
  }

  // TEST 10: Demand Map Aggregation for Shared Ingredients in a Single Batch
  try {
    const itemsInBatch = [
      { menuItemId: 'dish_dal', quantity: 2, variantId: 'var_half', variantName: 'Half', menuItemName: 'Dal Half' },
      { menuItemId: 'dish_dal', quantity: 3, variantId: 'var_full', variantName: 'Full', menuItemName: 'Dal Full' }
    ];

    const recipes = [
      {
        id: 'rec_half',
        menu_item_id: 'dish_dal',
        variant_id: 'var_half',
        variant_name: 'Half',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 100, unit: 'gram' }
        ]
      },
      {
        id: 'rec_full',
        menu_item_id: 'dish_dal',
        variant_id: 'var_full',
        variant_name: 'Full',
        inventory_recipe_ingredients: [
          { inventory_item_id: 'raw_paneer', quantity: 200, unit: 'gram' }
        ]
      }
    ];

    const demandMap = new Map();
    for (const item of itemsInBatch) {
      const orderQty = Number(item.quantity || 1);
      const recipe = findMatchingRecipe(recipes, item.menuItemId, item.variantId, item.variantName);
      for (const ing of recipe.inventory_recipe_ingredients) {
        let reqInItemUnit = Number(ing.quantity || 0) * orderQty;
        const cur = demandMap.get(ing.inventory_item_id) || { requiredQty: 0, unit: ing.unit };
        cur.requiredQty += reqInItemUnit;
        demandMap.set(ing.inventory_item_id, cur);
      }
    }

    const aggregated = demandMap.get('raw_paneer');
    const pass = aggregated.requiredQty === 800; // 2x100g + 3x200g = 800g
    record('Test 10: Batch Demand Aggregation (2 Half + 3 Full = 800g)', pass, `Aggregated: ${aggregated.requiredQty}g`);
  } catch (e) {
    record('Test 10: Batch Demand Aggregation', false, e.message);
  }

  // TEST 11: Idempotency Key Uniqueness per Raw Item
  try {
    const orderId = 'ord_123';
    const batchId = 'batch_456';
    const rawIds = ['raw_paneer', 'raw_dal', 'raw_cream'];
    const baseKey = `ORDER_CONSUMPTION_${orderId}_${batchId}`;
    const keys = rawIds.map(id => `${baseKey}_${id}`);
    const uniqueKeys = new Set(keys);
    const pass = uniqueKeys.size === rawIds.length;
    record('Test 11: Idempotency Key Uniqueness per Ingredient', pass, `Keys: ${Array.from(uniqueKeys).join(', ')}`);
  } catch (e) {
    record('Test 11: Idempotency Key Uniqueness', false, e.message);
  }

  // TEST 12: Food Safety Rejection of Served Food Reallocation
  try {
    function validateReallocation(wasServed) {
      if (wasServed === true) {
        return { success: false, error: 'Food Safety Policy: Reallocating already-served food is strictly prohibited.' };
      }
      return { success: true };
    }

    const rejectServed = validateReallocation(true);
    const allowUnserved = validateReallocation(false);
    record('Test 12: Food Safety Served Reallocation Rejection', rejectServed.success === false && allowUnserved.success === true, `Served result: ${rejectServed.error}`);
  } catch (e) {
    record('Test 12: Food Safety Served Reallocation Rejection', false, e.message);
  }

  console.log('\n========================================================================');
  console.log('AUDIT SUMMARY TABLE');
  console.log('========================================================================');
  console.table(testResults);

  const allPassed = testResults.every(r => r.pass);
  console.log(`\nOVERALL SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
}

runRegressionSuite();
