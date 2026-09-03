import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const categories = [
  'Starters',
  'Main Course',
  'Breads',
  'Rice',
  'Beverages',
  'Desserts'
];

async function main() {
  console.log('=== CREATING MENU CATEGORIES ON THE FOODY HUB ===\n');

  // Check if any categories already exist
  const { data: existing } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurantId);

  console.log(`Found ${existing?.length || 0} existing categories.`);

  for (let i = 0; i < categories.length; i++) {
    const catName = categories[i];
    const found = (existing || []).find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (found) {
      console.log(`Category "${catName}" already exists (ID: ${found.id}).`);
      continue;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        restaurant_id: restaurantId,
        name: catName,
        sort_order: i
      })
      .select()
      .single();

    if (error) {
      console.error(`Error creating category "${catName}":`, error.message);
    } else {
      console.log(`Created category "${catName}" with sort_order ${i} (ID: ${data.id}).`);
    }
  }

  // Fetch final list
  const { data: finalCats } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true });

  console.log('\nFinal Categories in DB for The Foody Hub:');
  finalCats?.forEach(c => console.log(` [${c.sort_order}] ${c.name} (ID: ${c.id})`));
}

main().catch(console.error);
