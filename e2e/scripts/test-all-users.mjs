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

const users = [
  { role: 'owner', email: 'owner@test.com', password: 'TestOwner123!' },
  { role: 'waiter', email: 'waiter@test.com', password: 'TestWaiter123!' },
  { role: 'kitchen', email: 'kitchen@test.com', password: 'TestKitchen123!' },
  { role: 'cashier', email: 'cashier@test.com', password: 'TestCashier123!' },
  { role: 'manager', email: 'manager@test.com', password: 'TestManager123!' },
  { role: 'superAdmin', email: 'superadmin@test.com', password: 'SuperAdmin123!' },
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
