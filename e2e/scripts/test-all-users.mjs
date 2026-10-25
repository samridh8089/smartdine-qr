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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const defaultPw = process.env.E2E_DEFAULT_PASSWORD || 'TestPass123!';
const users = [
  { role: 'owner', email: process.env.E2E_OWNER_EMAIL || 'owner@test.com', password: process.env.E2E_OWNER_PASSWORD || defaultPw },
  { role: 'waiter', email: process.env.E2E_WAITER_EMAIL || 'waiter@test.com', password: process.env.E2E_WAITER_PASSWORD || defaultPw },
  { role: 'kitchen', email: process.env.E2E_KITCHEN_EMAIL || 'kitchen@test.com', password: process.env.E2E_KITCHEN_PASSWORD || defaultPw },
  { role: 'cashier', email: process.env.E2E_CASHIER_EMAIL || 'cashier@test.com', password: process.env.E2E_CASHIER_PASSWORD || defaultPw },
  { role: 'manager', email: process.env.E2E_MANAGER_EMAIL || 'manager@test.com', password: process.env.E2E_MANAGER_PASSWORD || defaultPw },
  { role: 'superAdmin', email: process.env.E2E_SUPER_ADMIN_EMAIL || 'superadmin@test.com', password: process.env.E2E_SUPER_ADMIN_PASSWORD || defaultPw },
];

async function testAll() {
  for (const u of users) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: u.email,
      password: u.password
    });
    if (error) {
      console.log(`❌ Sign in FAILED for ${u.role} (${u.email}):`, error.message);
    } else {
      console.log(`✅ Sign in PASSED for ${u.role} (${u.email}) -> User ID:`, data.user.id);
    }
  }
}

testAll();
