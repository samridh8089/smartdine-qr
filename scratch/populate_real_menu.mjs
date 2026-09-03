import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('=== POPULATING REAL MENU ITEMS & VARIANTS ===\n');

  // 1. Fetch categories
  const { data: cats } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurantId);

  const getCatId = (name) => cats.find(c => c.name.toLowerCase() === name.toLowerCase())?.id;

  const menuData = [
    // STARTERS
    {
      category: 'Starters',
      name: 'Veg Spring Roll',
      description: 'Crispy golden fried spring rolls stuffed with seasoned julienned fresh vegetables, served with sweet chili dip.',
      price: 180,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop',
      variants: []
    },
    {
      category: 'Starters',
      name: 'Paneer Tikka',
      description: 'Succulent malai paneer cubes marinated in rich Kashmiri spices, yogurt and chargrilled to perfection in clay tandoor.',
      price: 260,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop',
      variants: []
    },

    // MAIN COURSE
    {
      category: 'Main Course',
      name: 'Paneer Butter Masala',
      description: 'Soft cottage cheese cubes simmered in a velvety, buttery makhani gravy enriched with fresh cream and royal spices.',
      price: 180,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop',
      variants: [
        { name: 'Half', price: 180, display_order: 1 },
        { name: 'Full', price: 320, display_order: 2 }
      ]
    },
    {
      category: 'Main Course',
      name: 'Dal Makhani',
      description: 'Authentic slow-cooked whole black lentils and kidney beans simmered overnight with churned butter and dairy cream.',
      price: 150,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop',
      variants: [
        { name: 'Half', price: 150, display_order: 1 },
        { name: 'Full', price: 280, display_order: 2 }
      ]
    },

    // BREADS
    {
      category: 'Breads',
      name: 'Butter Naan',
      description: 'Artisanal leavened fine flour bread baked in a red-hot clay tandoor and brushed generously with fresh Amul butter.',
      price: 45,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop',
      variants: []
    },
    {
      category: 'Breads',
      name: 'Tandoori Roti',
      description: 'Crisp whole wheat traditional flatbread roasted over flaming charcoal in clay oven.',
      price: 20,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop',
      variants: []
    },

    // RICE
    {
      category: 'Rice',
      name: 'Veg Biryani',
      description: 'Dum-cooked aged basmati rice layered with seasonal farm vegetables, caramelized onions, fresh mint and saffron.',
      price: 220,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop',
      variants: []
    },
    {
      category: 'Rice',
      name: 'Jeera Rice',
      description: 'Aromatic long-grain basmati rice tempered in pure desi ghee with fragrant cumin seeds.',
      price: 140,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop',
      variants: []
    },

    // BEVERAGES
    {
      category: 'Beverages',
      name: 'Cold Coffee',
      description: 'Classic velvety hand-blended cold coffee prepared with full cream milk, artisanal espresso and chocolate syrup.',
      price: 120,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop',
      variants: []
    },
    {
      category: 'Beverages',
      name: 'Fresh Lime Soda',
      description: 'Zesty refreshing soda infused with freshly pressed lime juice, mint leaves, rock salt and choice of sweet/salted.',
      price: 80,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop',
      variants: []
    },

    // DESSERTS
    {
      category: 'Desserts',
      name: 'Gulab Jamun',
      description: 'Golden fried khoya dumplings dipped in hot saffron cardamom sugar syrup (2 pieces).',
      price: 60,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop',
      variants: []
    },
    {
      category: 'Desserts',
      name: 'Brownie with Ice Cream',
      description: 'Warm, gooey Belgian dark chocolate fudge brownie served sizzling with a scoop of premium vanilla bean ice cream.',
      price: 180,
      is_veg: true,
      image_url: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop',
      variants: []
    }
  ];

  for (const item of menuData) {
    const catId = getCatId(item.category);
    if (!catId) {
      console.error(`Category ${item.category} not found for ${item.name}!`);
      continue;
    }

    const hasVariants = item.variants && item.variants.length > 0;

    const { data: insertedItem, error: itemErr } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        category_id: catId,
        name: item.name,
        description: item.description,
        price: item.price,
        is_veg: item.is_veg,
        is_available: true,
        image_url: item.image_url,
        has_variants: hasVariants
      })
      .select()
      .single();

    if (itemErr) {
      console.error(`Error inserting ${item.name}:`, itemErr.message);
      continue;
    }

    console.log(`✓ Inserted dish: "${item.name}" (ID: ${insertedItem.id}) [₹${item.price}]`);

    if (hasVariants) {
      for (const v of item.variants) {
        const { data: varData, error: varErr } = await supabase
          .from('menu_item_variants')
          .insert({
            menu_item_id: insertedItem.id,
            name: v.name,
            price: v.price,
            display_order: v.display_order,
            is_available: true
          })
          .select()
          .single();

        if (varErr) {
          console.error(`  - Error inserting variant ${v.name}:`, varErr.message);
        } else {
          console.log(`  └─ Variant: "${v.name}" - ₹${v.price} (ID: ${varData.id})`);
        }
      }
    }
  }

  console.log('\n=== REAL MENU POPULATION COMPLETE ===');
}

main().catch(console.error);
