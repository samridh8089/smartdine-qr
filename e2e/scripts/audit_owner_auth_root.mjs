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

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function auditOwnerAccount() {
  console.log('==================================================');
  console.log('AUDITING OWNER ACCOUNT AT SUPABASE & APP LEVEL');
  console.log('==================================================');

  // PART 2: SUPABASE AUTH USER AUDIT
  console.log('\n--- PART 2: SUPABASE AUTH USER ---');
  const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listErr) {
    console.error('Error listing auth users:', listErr.message);
    return;
  }

  const matchingUsers = usersData.users.filter(u => u.email?.toLowerCase() === 'you@gmail.com');
  console.log(`Matching Auth Users count: ${matchingUsers.length}`);

  if (matchingUsers.length === 0) {
    console.log('❌ AUTH USER EXISTS: FAIL - No auth user found for you@gmail.com!');
    return;
  }

  const authUser = matchingUsers[0];
  console.log(`AUTH USER EXISTS: PASS`);
  console.log(`EMAIL: ${authUser.email}`);
  console.log(`UUID: ${authUser.id}`);
  console.log(`EMAIL CONFIRMED: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`);
  console.log(`DISABLED/BANNED: ${authUser.banned_until ? 'YES' : 'NO'}`);

  // PART 3: PROFILES TABLE AUDIT
  console.log('\n--- PART 3: PROFILES TABLE ---');
  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profErr || !profile) {
    console.log(`PROFILE FETCH: FAIL - ${profErr?.message || 'Profile not found'}`);
  } else {
    console.log('PROFILE FETCH: PASS');
    console.log(`PROFILE ID: ${profile.id}`);
    console.log(`PROFILE EMAIL: ${profile.email}`);
    console.log(`PROFILE ROLE: ${profile.role}`);
    console.log(`RESTAURANT ID: ${profile.restaurant_id}`);

    // Verify restaurant
    const { data: rest, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', profile.restaurant_id)
      .single();

    console.log(`RESTAURANT EXISTS: ${rest ? 'PASS (' + rest.name + ')' : 'FAIL (' + restErr?.message + ')'}`);
  }

  // PART 5: SUPABASE AUTH SIGN IN TEST
  console.log('\n--- PART 5: SUPABASE AUTH SIGN IN TEST ---');
  
  // Test password 'Password123!'
  const { data: signData1, error: signErr1 } = await supabaseAnon.auth.signInWithPassword({
    email: 'you@gmail.com',
    password: 'Password123!'
  });

  if (signErr1) {
    console.log(`Sign-in with 'Password123!' failed: ${signErr1.message} (code: ${signErr1.code}, status: ${signErr1.status})`);
  } else {
    console.log(`✅ Sign-in with 'Password123!' SUCCEEDED! User ID: ${signData1.user.id}, Session Token: ${signData1.session ? 'Valid' : 'None'}`);
  }

  // Test password '123456'
  const { data: signData2, error: signErr2 } = await supabaseAnon.auth.signInWithPassword({
    email: 'you@gmail.com',
    password: '123456'
  });

  if (signErr2) {
    console.log(`Sign-in with '123456' failed: ${signErr2.message} (code: ${signErr2.code}, status: ${signErr2.status})`);
  } else {
    console.log(`✅ Sign-in with '123456' SUCCEEDED! User ID: ${signData2.user.id}, Session Token: ${signData2.session ? 'Valid' : 'None'}`);
  }
}

auditOwnerAccount();
