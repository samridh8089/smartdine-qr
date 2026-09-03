import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env.local', 'utf8');
let anonKey = '';
envText.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    anonKey = t.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';

const accounts = [
  { role: 'Owner', email: 'dsoni1281@gmail.com', pass: 'FoodyHub@Owner2026!' },
  { role: 'Kitchen (KDS)', email: 'newlifeofdeepsssa@gmail.com', pass: 'FoodyHub@Kds2026!' },
  { role: 'Waiter 1', email: 'samridhtomar8@gmail.com', pass: 'FoodyHub@W1_2026!' },
  { role: 'Waiter 2', email: 'poojagarg0885@gmail.com', pass: 'FoodyHub@W2_2026!' },
  { role: 'Cashier', email: 'deepak.soni19492@gmail.com', pass: 'FoodyHub@Cash2026!' }
];

async function main() {
  console.log('====================================================');
  console.log('=== SUPABASE AUTH LIVE VERIFICATION FOR 5 USERS  ===');
  console.log('====================================================');

  const results = [];

  for (const acc of accounts) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: acc.email,
      password: acc.pass
    });

    if (error) {
      results.push({
        role: acc.role,
        email: acc.email,
        authStatus: 'FAILED',
        error: error.message
      });
    } else {
      results.push({
        role: acc.role,
        email: acc.email,
        authStatus: 'VERIFIED_ACTIVE',
        userId: data.user.id,
        emailConfirmedAt: data.user.email_confirmed_at,
        lastSignInAt: data.user.last_sign_in_at,
        createdAt: data.user.created_at
      });
    }
  }

  console.table(results);
}

main().catch(console.error);
