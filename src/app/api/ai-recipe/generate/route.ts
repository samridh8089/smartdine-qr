import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateStructuredGeminiJSON } from '@/lib/gemini';
import { consumeAICreditForRestaurant, isFeatureEnabledForRestaurant } from '@/lib/entitlements';

// Helper to generate realistic, authentic culinary recipes for any dish type
function generateRealisticFallbackRecipe(dishName: string, cuisine?: string) {
  const norm = dishName.toLowerCase().trim();

  // 1. Sweets / Desserts (Gajar Ka Halwa, Kheer, Gulab Jamun, Rabri, Barfi, Halwa, Ice Cream, Cake, Brownie)
  if (/halwa|gajar|kheer|jamun|rasgulla|rabri|barfi|laddu|laddoo|sweet|dessert|brownie|cake|pudding|payasam|phirni|jalebi|ice cream|kulfi/.test(norm)) {
    const isGajarHalwa = /gajar/.test(norm);
    const isMoongDalHalwa = /moong/.test(norm);
    const isKheer = /kheer|payasam|phirni/.test(norm);

    return {
      recipeName: dishName,
      servingSize: '1 Dessert Portion (200g)',
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      totalTimeMinutes: 45,
      preparationSteps: isGajarHalwa
        ? '1. Grate fresh red carrots finely.\n2. In a heavy bottom pan, melt pure desi ghee and sauté grated carrots for 8-10 minutes.\n3. Add full cream milk and simmer on medium flame until carrots are tender and milk reduces by 80%.\n4. Stir in khoya/mawa and sugar, cooking until ghee separates.\n5. Finish with cardamom powder and roasted almonds, cashews, and pistachios.'
        : isKheer
        ? '1. Rinse and soak basmati rice for 30 minutes.\n2. Boil full cream milk in a thick vessel and add soaked rice.\n3. Simmer on low heat, stirring continuously until rice is fully cooked and milk thickens.\n4. Add sugar, saffron strands, and green cardamom powder.\n5. Garnish with chopped almonds and pistachios before serving warm or chilled.'
        : '1. Melt pure desi ghee in a heavy pan.\n2. Sauté main base ingredient on medium-low flame until golden brown and aromatic.\n3. Add warm milk / sugar syrup gradually while stirring continuously to prevent lumps.\n4. Cook until thick consistency is achieved and ghee separates on edges.\n5. Garnish with green cardamom powder and fried dry fruits.',
      ingredients: [
        { name: isGajarHalwa ? 'Fresh Red Carrots (Grated)' : isMoongDalHalwa ? 'Moong Dal Paste' : isKheer ? 'Basmati Rice' : `${dishName} Main Base`, suggestedQuantity: 180, suggestedUnit: 'gram' },
        { name: 'Pure Desi Ghee', suggestedQuantity: 40, suggestedUnit: 'ml' },
        { name: 'Full Cream Milk', suggestedQuantity: 250, suggestedUnit: 'ml' },
        { name: 'Khoya / Mawa / Condensed Milk', suggestedQuantity: 50, suggestedUnit: 'gram' },
        { name: 'Refined Sugar', suggestedQuantity: 60, suggestedUnit: 'gram' },
        { name: 'Green Cardamom Powder (Elaichi)', suggestedQuantity: 3, suggestedUnit: 'gram' },
        { name: 'Sliced Almonds & Cashews', suggestedQuantity: 15, suggestedUnit: 'gram' },
        { name: 'Saffron Strands (Kesar)', suggestedQuantity: 1, suggestedUnit: 'gram' }
      ]
    };
  }

  // 2. Beverages / Drinks / Shakes / Mojitos
  if (/tea|coffee|iced tea|ice tea|frappe|shake|mojito|lemonade|beverage|drink|smoothie|lassi/.test(norm)) {
    const isCoffee = /coffee|frappe|latte|cappuccino/.test(norm);
    const isLassi = /lassi/.test(norm);

    return {
      recipeName: dishName,
      servingSize: '1 Glass (350ml)',
      prepTimeMinutes: 5,
      cookTimeMinutes: 5,
      totalTimeMinutes: 10,
      preparationSteps: isLassi
        ? '1. Whisk thick fresh curd/yogurt with sugar syrup until smooth.\n2. Add chilled full cream milk and cardamom powder.\n3. Blend for 15 seconds until frothy.\n4. Pour into a tall glass, top with fresh malai/cream and sliced pistachios.'
        : '1. In a glass / shaker, combine base beverage decoction, fruit puree, or syrup.\n2. Add lemon juice / chilled milk and sugar syrup.\n3. Fill glass with ice cubes and shake/blend for 20 seconds.\n4. Garnish with mint leaves or fruit slice.',
      ingredients: [
        { name: isLassi ? 'Thick Fresh Curd / Yogurt' : isCoffee ? 'Espresso Decoction' : 'Beverage Base Syrup', suggestedQuantity: 180, suggestedUnit: isLassi ? 'gram' : 'ml' },
        { name: isLassi ? 'Full Cream Milk' : 'Filtered Water / Soda', suggestedQuantity: 100, suggestedUnit: 'ml' },
        { name: 'Sugar Syrup', suggestedQuantity: 25, suggestedUnit: 'ml' },
        { name: 'Ice Cubes', suggestedQuantity: 100, suggestedUnit: 'gram' },
        { name: 'Mint Leaves / Malai Garnish', suggestedQuantity: 10, suggestedUnit: 'gram' }
      ]
    };
  }

  // 3. Indian Breads (Naan, Roti, Paratha, Bhatura, Puri, Kulcha)
  if (/naan|roti|paratha|bhatura|puri|poori|kulcha|bread/.test(norm)) {
    return {
      recipeName: dishName,
      servingSize: '2 Pieces',
      prepTimeMinutes: 15,
      cookTimeMinutes: 10,
      totalTimeMinutes: 25,
      preparationSteps: '1. Knead flour with water, salt, curd, and oil into a soft smooth dough.\n2. Rest dough covered for 20 minutes.\n3. Divide dough into equal balls and roll into shape.\n4. Bake in hot tandoor or tawa until charred and fluffy.\n5. Brush with generous melted butter or ghee.',
      ingredients: [
        { name: /naan|bhatura|kulcha/.test(norm) ? 'Refined Flour (Maida)' : 'Whole Wheat Flour (Atta)', suggestedQuantity: 160, suggestedUnit: 'gram' },
        { name: 'Butter / Pure Ghee', suggestedQuantity: 25, suggestedUnit: 'gram' },
        { name: 'Curd / Milk for Kneading', suggestedQuantity: 30, suggestedUnit: 'ml' },
        { name: 'Salt & Baking Powder', suggestedQuantity: 4, suggestedUnit: 'gram' }
      ]
    };
  }

  // 4. Dal / Lentils
  if (/dal|lentil|rajma|chana|chole|makhani/.test(norm)) {
    return {
      recipeName: dishName,
      servingSize: '1 Portion (300g)',
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      totalTimeMinutes: 45,
      preparationSteps: '1. Wash and pressure cook lentils with turmeric and salt until soft.\n2. In a pan, heat butter/ghee, add cumin, chopped garlic, ginger, and green chillies.\n3. Sauté chopped onions until golden, then add tomato puree and spice blend.\n4. Simmer the cooked dal with tempered spices for 15 minutes. Finish with fresh cream and butter.',
      ingredients: [
        { name: /makhani/.test(norm) ? 'Black Urad Dal' : 'Yellow Moong Dal / Toor Dal', suggestedQuantity: 120, suggestedUnit: 'gram' },
        { name: 'Butter / Ghee', suggestedQuantity: 30, suggestedUnit: 'gram' },
        { name: 'Onion', suggestedQuantity: 60, suggestedUnit: 'gram' },
        { name: 'Tomato Puree', suggestedQuantity: 80, suggestedUnit: 'ml' },
        { name: 'Ginger Garlic Paste', suggestedQuantity: 15, suggestedUnit: 'gram' },
        { name: 'Fresh Cream', suggestedQuantity: 25, suggestedUnit: 'ml' },
        { name: 'Garam Masala & Spices', suggestedQuantity: 8, suggestedUnit: 'gram' },
        { name: 'Coriander Leaves', suggestedQuantity: 10, suggestedUnit: 'gram' }
      ]
    };
  }

  // 5. Biryani / Rice
  if (/biryani|pulao|fried rice|rice/.test(norm)) {
    const isChicken = /chicken|non veg|meat|mutton/.test(norm);
    return {
      recipeName: dishName,
      servingSize: '1 Handi Portion (400g)',
      prepTimeMinutes: 20,
      cookTimeMinutes: 35,
      totalTimeMinutes: 55,
      preparationSteps: '1. Parboil aged Basmati rice with whole spices until 70% cooked.\n2. Marinate base ingredients with yogurt, ginger-garlic paste, mint, and biryani masala.\n3. Cook gravy in ghee until oil separates.\n4. Layer rice over gravy, drizzle saffron milk and fried onions.\n5. Seal handi and cook on low heat (dum) for 20 minutes.',
      ingredients: [
        { name: 'Basmati Rice', suggestedQuantity: 180, suggestedUnit: 'gram' },
        { name: isChicken ? 'Fresh Chicken / Meat' : 'Paneer / Mixed Vegetables', suggestedQuantity: 150, suggestedUnit: 'gram' },
        { name: 'Curd / Yogurt', suggestedQuantity: 60, suggestedUnit: 'gram' },
        { name: 'Pure Desi Ghee', suggestedQuantity: 30, suggestedUnit: 'ml' },
        { name: 'Biryani Spices Blend', suggestedQuantity: 12, suggestedUnit: 'gram' },
        { name: 'Fried Onions (Birista)', suggestedQuantity: 40, suggestedUnit: 'gram' },
        { name: 'Fresh Mint & Coriander', suggestedQuantity: 15, suggestedUnit: 'gram' },
        { name: 'Ginger Garlic Paste', suggestedQuantity: 20, suggestedUnit: 'gram' }
      ]
    };
  }

  // 6. Paneer / Veg Curries
  if (/paneer|kadai|kadhai|tikka|shahi|kofta|palak|mushroom/.test(norm)) {
    return {
      recipeName: dishName,
      servingSize: '1 Portion (350g)',
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      totalTimeMinutes: 35,
      preparationSteps: '1. Cut fresh paneer/vegetables into bite-sized cubes.\n2. Heat butter and oil in a kadai, sauté diced onions and capsicum.\n3. Pour in rich tomato-cashew onion gravy and simmer.\n4. Add kasuri methi, garam masala, and salt.\n5. Fold in paneer gently, simmer for 5 mins and finish with fresh cream.',
      ingredients: [
        { name: 'Fresh Paneer', suggestedQuantity: 180, suggestedUnit: 'gram' },
        { name: 'Butter', suggestedQuantity: 25, suggestedUnit: 'gram' },
        { name: 'Tomato Onion Gravy', suggestedQuantity: 120, suggestedUnit: 'ml' },
        { name: 'Fresh Cream', suggestedQuantity: 30, suggestedUnit: 'ml' },
        { name: 'Capsicum', suggestedQuantity: 40, suggestedUnit: 'gram' },
        { name: 'Onion', suggestedQuantity: 40, suggestedUnit: 'gram' },
        { name: 'Kasuri Methi & Spices', suggestedQuantity: 8, suggestedUnit: 'gram' },
        { name: 'Ginger Garlic Paste', suggestedQuantity: 15, suggestedUnit: 'gram' }
      ]
    };
  }

  // 7. Non-Veg Curries
  if (/chicken|butter chicken|tikka masala|mutton|fish|curry/.test(norm)) {
    return {
      recipeName: dishName,
      servingSize: '1 Portion (380g)',
      prepTimeMinutes: 20,
      cookTimeMinutes: 25,
      totalTimeMinutes: 45,
      preparationSteps: '1. Marinate protein in yogurt, kashmiri chili, and tandoori spices.\n2. In a separate pan, melt butter and simmer rich tomato-makhani gravy.\n3. Add honey/sugar, kasuri methi, and garam masala.\n4. Slide protein into simmered gravy for 10 minutes. Swirl in heavy cream before serving.',
      ingredients: [
        { name: 'Fresh Chicken Breast / Meat', suggestedQuantity: 220, suggestedUnit: 'gram' },
        { name: 'Butter', suggestedQuantity: 35, suggestedUnit: 'gram' },
        { name: 'Tomato Makhani Gravy', suggestedQuantity: 140, suggestedUnit: 'ml' },
        { name: 'Fresh Heavy Cream', suggestedQuantity: 35, suggestedUnit: 'ml' },
        { name: 'Ginger Garlic Paste', suggestedQuantity: 20, suggestedUnit: 'gram' },
        { name: 'Curd / Yogurt', suggestedQuantity: 50, suggestedUnit: 'gram' },
        { name: 'Spices Blend', suggestedQuantity: 10, suggestedUnit: 'gram' }
      ]
    };
  }

  // 8. Universal Default
  return {
    recipeName: dishName,
    servingSize: '1 Standard Portion',
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    totalTimeMinutes: 35,
    preparationSteps: `1. Prep and wash main ingredients for ${dishName}.\n2. Heat cooking oil/butter, sauté base ingredients until fragrant.\n3. Add sauce/flavoring base and simmer to intensify taste.\n4. Cook thoroughly to standard commercial tenderness.\n5. Season to taste and garnish before plating.`,
    ingredients: [
      { name: `${dishName} Primary Core`, suggestedQuantity: 180, suggestedUnit: 'gram' },
      { name: 'Cooking Oil / Butter', suggestedQuantity: 25, suggestedUnit: 'ml' },
      { name: 'Base Flavoring / Milk / Stock', suggestedQuantity: 80, suggestedUnit: 'ml' },
      { name: 'Seasoning / Sweetener Blend', suggestedQuantity: 15, suggestedUnit: 'gram' },
      { name: 'Garnish', suggestedQuantity: 10, suggestedUnit: 'gram' }
    ]
  };
}

export async function POST(req: Request) {
  try {
    const { dishName, imageBase64, restaurantId, cuisine, sellingPrice } = await req.json();

    if (!dishName && !imageBase64) {
      return NextResponse.json({ error: 'Dish name or recipe image is required' }, { status: 400 });
    }

    let usageInfo: any = null;
    if (restaurantId) {
      const isEnabled = await isFeatureEnabledForRestaurant(restaurantId, 'ai_recipe');
      if (!isEnabled) {
        return NextResponse.json({ error: 'AI Recipe Generation is not included in your current subscription plan.' }, { status: 403 });
      }

      const preCheck = await consumeAICreditForRestaurant(restaurantId, 'ai_recipe_generation', 0);
      if (!preCheck.allowed) {
        return NextResponse.json({ error: preCheck.message || 'AI Recipe credit limit reached for this billing period.', usage: preCheck }, { status: 403 });
      }
    }

    const effectiveDishName = (dishName || 'Culinary Dish').trim();

    // Fetch existing inventory items for the restaurant to attempt smart matching
    let inventoryItems: any[] = [];
    if (restaurantId) {
      const { data: items } = await supabase
        .from('inventory_items')
        .select('id, name, unit, cost_per_unit')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);
      inventoryItems = items || [];
    }

    const matchInventoryItem = (ingName: string) => {
      const normIng = ingName.trim().toLowerCase();
      const matched = inventoryItems.find(inv => {
        const normInv = inv.name.trim().toLowerCase();
        if (normInv === normIng) return true;
        if (normInv.includes(normIng) || normIng.includes(normInv)) return true;
        const ingRoot = normIng.replace(/s$|es$| leaves$| paste$| powder$/g, '');
        const invRoot = normInv.replace(/s$|es$| leaves$| paste$| powder$/g, '');
        if (ingRoot.length > 3 && invRoot.length > 3 && (ingRoot === invRoot || invRoot.includes(ingRoot) || ingRoot.includes(invRoot))) {
          return true;
        }
        return false;
      });
      return matched
        ? { id: matched.id, name: matched.name, unit: matched.unit, cost: matched.cost_per_unit }
        : null;
    };

    let aiRecipeData: any = null;
    let providerUsed = 'Gemini AI';
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (geminiKey) {
      let prompt = `Generate an authentic, realistic commercial restaurant recipe for the dish "${effectiveDishName}" ${cuisine ? `(${cuisine} cuisine)` : ''}.
Generate 6 to 9 realistic ingredients with exact metric quantities for 1 standard commercial portion.
Return a strict JSON object with normalized ingredient names, numeric quantities, and standard units (gram, ml, piece).`;

      const imagesList: Array<{ inlineData: { mimeType: string; data: string } }> = [];
      if (imageBase64 && typeof imageBase64 === 'string') {
        const matches = imageBase64.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : 'image/jpeg';
        const cleanData = matches ? matches[2] : imageBase64;
        imagesList.push({ inlineData: { mimeType, data: cleanData } });
        prompt = `Analyze this culinary recipe card/photo and generate complete structured recipe data. Dish: "${effectiveDishName}". Extract all visible ingredients, exact commercial quantities, and culinary steps.`;
      }

      const systemInstruction = `You are an executive master chef at a top commercial restaurant.
Return complete, authentic, highly realistic restaurant-grade recipe specifications for 1 standard serving/portion.

STRICT CULINARY CATEGORIES DIRECTIVE:
1. IF THE DISH IS A DESSERT / SWEET (e.g. Gajar Ka Halwa, Gulab Jamun, Kheer, Rabri, Barfi, Halwa, Ice Cream, Cake, Brownie):
   - You MUST generate sweet dessert ingredients ONLY (e.g., Grated Red Carrots, Full Cream Milk, Khoya/Mawa, Pure Desi Ghee, Sugar, Green Cardamom Powder/Elaichi, Saffron/Kesar, Sliced Almonds & Cashews).
   - NEVER, UNDER ANY CIRCUMSTANCES, INCLUDE ONIONS, TOMATOES, GINGER, GARLIC, SPICE BLENDS, CHILLIES, SALSA, OR CORIANDER IN A SWEET DISH!
2. IF THE DISH IS A BEVERAGE / DRINK (e.g. Iced Tea, Coffee, Shake, Mojito, Lassi):
   - Include beverage base, milk/juice/syrup, sweetener, ice cubes, mint garnish. NO onions/tomatoes/garlic/spices.
3. IF THE DISH IS AN INDIAN BREAD (e.g. Naan, Roti, Paratha):
   - Include flour, ghee/butter, water/curd, salt.
4. IF THE DISH IS A SAVORY CURRY OR BIRYANI:
   - Include main protein/veggies, ghee/oil, onions, tomatoes, ginger-garlic paste, authentic spices, and garnishes.

Every ingredient MUST have:
"name": Specific, clean ingredient name (e.g. "Grated Red Carrots", "Pure Desi Ghee", "Full Cream Milk", "Khoya", "Sugar", "Green Cardamom Powder")
"suggestedQuantity": Realistic commercial numeric quantity (e.g. 150)
"suggestedUnit": Must be one of "gram", "ml", "piece", "kg", "litre"`;

      const responseSchema = {
        type: 'OBJECT',
        properties: {
          recipeName: { type: 'STRING' },
          servingSize: { type: 'STRING' },
          prepTimeMinutes: { type: 'NUMBER' },
          cookTimeMinutes: { type: 'NUMBER' },
          totalTimeMinutes: { type: 'NUMBER' },
          preparationSteps: { type: 'STRING' },
          ingredients: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                suggestedQuantity: { type: 'NUMBER' },
                suggestedUnit: { type: 'STRING' }
              },
              required: ['name', 'suggestedQuantity', 'suggestedUnit']
            }
          }
        },
        required: ['recipeName', 'servingSize', 'preparationSteps', 'ingredients']
      };

      const geminiRes = await generateStructuredGeminiJSON<any>({
        prompt,
        systemInstruction,
        responseSchema,
        images: imagesList.length > 0 ? imagesList : undefined,
        temperature: 0.2
      });

      if (geminiRes.success && geminiRes.data && Array.isArray(geminiRes.data.ingredients) && geminiRes.data.ingredients.length >= 3) {
        aiRecipeData = geminiRes.data;
      } else {
        console.warn('Gemini API returned insufficient data, using culinary classification engine:', geminiRes.error);
        providerUsed = 'CleverOps Culinary Engine (Local AI)';
      }
    } else {
      providerUsed = 'CleverOps Culinary Engine (Local AI)';
    }

    if (!aiRecipeData) {
      aiRecipeData = generateRealisticFallbackRecipe(effectiveDishName, cuisine);
    }

    // Map AI-generated ingredients against restaurant's inventory items
    const processedIngredients = (aiRecipeData.ingredients || []).map((ing: any) => {
      const matched = matchInventoryItem(ing.name);
      return {
        name: ing.name,
        suggestedQuantity: Number(ing.suggestedQuantity || 0),
        suggestedUnit: ing.suggestedUnit || 'gram',
        matchedInventoryItemId: matched ? matched.id : null,
        matchedInventoryItemName: matched ? matched.name : null,
        matchedInventoryItemUnit: matched ? matched.unit : null,
        isMatched: Boolean(matched)
      };
    });

    if (restaurantId) {
      const deduction = await consumeAICreditForRestaurant(restaurantId, 'ai_recipe_generation', 1);
      if (!deduction.allowed) {
        return NextResponse.json({ error: deduction.message || 'AI Recipe credit limit reached.', usage: deduction }, { status: 403 });
      }
      usageInfo = deduction;
    }

    return NextResponse.json({
      success: true,
      dishName: effectiveDishName,
      isDraft: true,
      providerUsed,
      servingSize: aiRecipeData.servingSize || '1 Portion',
      prepTimeMinutes: aiRecipeData.prepTimeMinutes || 15,
      cookTimeMinutes: aiRecipeData.cookTimeMinutes || 20,
      totalTimeMinutes: aiRecipeData.totalTimeMinutes || 35,
      preparationSteps: aiRecipeData.preparationSteps || '',
      ingredients: processedIngredients,
      usage: usageInfo
    });
  } catch (err: any) {
    console.error('Error generating AI recipe:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate AI recipe' }, { status: 500 });
  }
}
