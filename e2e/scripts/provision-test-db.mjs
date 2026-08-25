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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function provision() {
  console.log('🚀 Provisioning Supabase Test Database...');

  // 1. Seed Restaurant
  const { error: restErr } = await supabase.from('restaurants').upsert({
    id: 'e2e-rest-1',
    name: 'SmartDine QA Restaurant',
    slug: 'test-restaurant',
    subscription_plan: 'pro',
    subscription_status: 'active',
    phone: '1234567890',
    address: '123 Test St',
    settings: {
      currency: 'INR',
      gst_percentage: 5,
      service_charge_percentage: 0,
      takeaway_enabled: true,
      reservation_enabled: true
    }
  });

  if (restErr) console.error('Error seeding restaurant:', restErr);
  else console.log('✅ Restaurant seeded (test-restaurant)');

  // 2. Users to create
  const users = [
    { email: 'owner@test.com', password: 'TestOwner123!', role: 'owner', name: 'QA Owner' },
    { email: 'waiter@test.com', password: 'TestWaiter123!', role: 'waiter', name: 'QA Waiter' },
    { email: 'kitchen@test.com', password: 'TestKitchen123!', role: 'kitchen', name: 'QA Kitchen' },
    { email: 'cashier@test.com', password: 'TestCashier123!', role: 'cashier', name: 'QA Cashier' },
    { email: 'manager@test.com', password: 'TestManager123!', role: 'manager', name: 'QA Manager' },
    { email: 'superadmin@test.com', password: 'SuperAdmin123!', role: 'super_admin', name: 'QA SuperAdmin' }
  ];

  for (const user of users) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find(u => u.email === user.email);

    if (!authUser) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.name, role: user.role }
      });
      if (createErr) {
        console.error(`Failed to create user ${user.email}:`, createErr.message);
      } else {
        authUser = created.user;
        console.log(`✅ Auth user created: ${user.email}`);
      }
    } else {
      console.log(`ℹ️ Auth user already exists: ${user.email}`);
    }

    if (authUser) {
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: authUser.id,
        email: user.email,
        full_name: user.name,
        role: user.role,
        restaurant_id: user.role === 'super_admin' ? null : 'e2e-rest-1'
      });
      if (profErr) console.error(`Error updating profile for ${user.email}:`, profErr);
    }
  }

  // 3. Seed Tables
  const tables = [
    { id: 'e2e-table-1', restaurant_id: 'e2e-rest-1', name: 'Table 1' },
    { id: 'e2e-table-2', restaurant_id: 'e2e-rest-1', name: 'Table 2' }
  ];
  for (const t of tables) {
    const { error } = await supabase.from('tables').upsert(t);
    if (error) console.error(`Error seeding table ${t.name}:`, error);
  }
  console.log('✅ Tables seeded (Table 1, Table 2)');

  // 4. Seed Categories
  const categories = [
    { id: 'e2e-cat-1', restaurant_id: 'e2e-rest-1', name: 'Starters', sort_order: 1 },
    { id: 'e2e-cat-2', restaurant_id: 'e2e-rest-1', name: 'Main Course', sort_order: 2 }
  ];
  for (const c of categories) {
    const { error } = await supabase.from('categories').upsert(c);
    if (error) console.error(`Error seeding category ${c.name}:`, error);
  }
  console.log('✅ Categories seeded (Starters, Main Course)');

  // 5. Seed Menu Items
  const items = [
    { id: 'e2e-item-1', restaurant_id: 'e2e-rest-1', category_id: 'e2e-cat-1', name: 'Paneer Tikka', price: 200, is_available: true, is_veg: true },
    { id: 'e2e-item-2', restaurant_id: 'e2e-rest-1', category_id: 'e2e-cat-1', name: 'Chicken Tikka', price: 250, is_available: true, is_veg: false },
    { id: 'e2e-item-3', restaurant_id: 'e2e-rest-1', category_id: 'e2e-cat-2', name: 'Butter Chicken', price: 400, is_available: true, is_veg: false },
    { id: 'e2e-item-4', restaurant_id: 'e2e-rest-1', category_id: 'e2e-cat-2', name: 'Naan', price: 50, is_available: true, is_veg: true },
    { id: 'e2e-item-out-1', restaurant_id: 'e2e-rest-1', category_id: 'e2e-cat-2', name: 'Truffle Pasta', price: 600, is_available: false, is_veg: true }
  ];
  for (const item of items) {
    const { error } = await supabase.from('menu_items').upsert(item);
    if (error) console.error(`Error seeding menu item ${item.name}:`, error);
  }
  console.log('✅ Menu items seeded');

  console.log('🎉 Supabase Database Provisioning Complete!');
}

provision().catch(console.error);
