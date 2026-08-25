import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv(file) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    }
  }
}

loadEnv('.env.test');
loadEnv('.env.local');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RESTAURANT_ID = 'e2e00000-0000-0000-0000-000000000001';
const TABLE_1_ID   = 'e2e00000-0000-0000-0000-000000000011';
const TABLE_2_ID   = 'e2e00000-0000-0000-0000-000000000012';
const CAT_1_ID     = 'e2e00000-0000-0000-0000-000000000021';
const CAT_2_ID     = 'e2e00000-0000-0000-0000-000000000022';

async function seed() {
  console.log('🌱 Seeding Supabase database with valid UUIDs...');

  // 1. Restaurant
  const { data: rest, error: restErr } = await supabase.from('restaurants').upsert({
    id: RESTAURANT_ID,
    name: 'SmartDine QA Restaurant',
    slug: 'test-restaurant',
    phone: '1234567890',
    address: '123 QA Lane',
    subscription_plan: 'pro',
    subscription_status: 'active',
    settings: {
      currency: 'INR',
      gst_percentage: 5,
      service_charge_percentage: 0,
      takeaway_enabled: true,
      reservation_enabled: true
    }
  }).select();

  if (restErr) console.error('Restaurant Error:', restErr);
  else console.log('✅ Restaurant seeded: test-restaurant');

  // 2. Profiles for auth users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  for (const u of users || []) {
    const roleMap = {
      'owner@test.com': 'owner',
      'waiter@test.com': 'waiter',
      'kitchen@test.com': 'kitchen',
      'cashier@test.com': 'cashier',
      'manager@test.com': 'manager',
      'superadmin@test.com': 'super_admin'
    };
    const role = roleMap[u.email];
    if (role) {
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: u.id,
        email: u.email,
        full_name: `QA ${role.toUpperCase()}`,
        role,
        restaurant_id: role === 'super_admin' ? null : RESTAURANT_ID
      });
      if (profErr) console.error(`Profile Error (${u.email}):`, profErr);
      else console.log(`✅ Profile linked for ${u.email}`);
    }
  }

  // 3. Tables
  const { error: tErr } = await supabase.from('tables').upsert([
    { id: TABLE_1_ID, restaurant_id: RESTAURANT_ID, name: 'Table 1' },
    { id: TABLE_2_ID, restaurant_id: RESTAURANT_ID, name: 'Table 2' }
  ]);
  if (tErr) console.error('Table Error:', tErr);
  else console.log('✅ Tables seeded: Table 1, Table 2');

  // 4. Categories
  const { error: cErr } = await supabase.from('categories').upsert([
    { id: CAT_1_ID, restaurant_id: RESTAURANT_ID, name: 'Starters', sort_order: 1 },
    { id: CAT_2_ID, restaurant_id: RESTAURANT_ID, name: 'Main Course', sort_order: 2 }
  ]);
  if (cErr) console.error('Category Error:', cErr);
  else console.log('✅ Categories seeded: Starters, Main Course');

  // 5. Menu Items
  const { error: mErr } = await supabase.from('menu_items').upsert([
    { id: 'e2e00000-0000-0000-0000-000000000031', restaurant_id: RESTAURANT_ID, category_id: CAT_1_ID, name: 'Paneer Tikka', price: 200, is_available: true, is_veg: true },
    { id: 'e2e00000-0000-0000-0000-000000000032', restaurant_id: RESTAURANT_ID, category_id: CAT_1_ID, name: 'Chicken Tikka', price: 250, is_available: true, is_veg: false },
    { id: 'e2e00000-0000-0000-0000-000000000033', restaurant_id: RESTAURANT_ID, category_id: CAT_2_ID, name: 'Butter Chicken', price: 400, is_available: true, is_veg: false },
    { id: 'e2e00000-0000-0000-0000-000000000034', restaurant_id: RESTAURANT_ID, category_id: CAT_2_ID, name: 'Naan', price: 50, is_available: true, is_veg: true },
    { id: 'e2e00000-0000-0000-0000-000000000035', restaurant_id: RESTAURANT_ID, category_id: CAT_2_ID, name: 'Truffle Pasta', price: 600, is_available: false, is_veg: true }
  ]);
  if (mErr) console.error('Menu Item Error:', mErr);
  else console.log('✅ Menu items seeded successfully');

  console.log('✨ All seed data provisioned successfully with valid UUIDs!');
}

seed();
