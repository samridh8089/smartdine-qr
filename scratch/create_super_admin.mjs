import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!serviceRoleKey) {
  console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const client = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('=== RECREATING PRODUCTION SUPER ADMIN ACCOUNT ===\n');

  const adminEmail = 'admin@cleverops.in';
  const adminPassword = 'Admin@12345!';

  // 1. Check if user already exists in auth.users
  const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listing users:', listErr.message);
    process.exit(1);
  }

  let existingUser = listData.users.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase());
  let userId = '';

  if (existingUser) {
    console.log(`User ${adminEmail} exists in auth.users (ID: ${existingUser.id}). Updating password and metadata...`);
    const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        fullName: 'Super Admin',
        role: 'super_admin'
      }
    });
    if (updateErr) {
      console.error('Error updating auth user:', updateErr.message);
      process.exit(1);
    }
    userId = existingUser.id;
  } else {
    console.log(`Creating fresh auth user: ${adminEmail}...`);
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        fullName: 'Super Admin',
        role: 'super_admin'
      }
    });

    if (createErr || !created?.user) {
      console.error('Error creating auth user:', createErr?.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`Auth user created successfully with ID: ${userId}`);
  }

  // 2. Ensure profile in public.profiles has role = 'super_admin'
  console.log('\nChecking and updating profile in public.profiles...');
  const { data: profData, error: profErr } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      user_id: userId,
      email: adminEmail,
      full_name: 'Super Admin',
      role: 'super_admin',
      restaurant_id: null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    .select()
    .single();

  if (profErr) {
    console.error('Error upserting profile:', profErr.message);
    process.exit(1);
  }

  console.log('Profile confirmed in public.profiles:');
  console.log(JSON.stringify(profData, null, 2));

  // 3. Verify sign-in via client API (same as /login)
  console.log('\nTesting client sign-in via signInWithPassword (simulating /login)...');
  const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (signInErr || !signInData.session) {
    console.error('Sign-in failed:', signInErr?.message);
    process.exit(1);
  }

  console.log('Sign-in SUCCESSFUL!');
  console.log(`Session user ID: ${signInData.user.id}`);
  console.log(`User metadata role: ${signInData.user.user_metadata.role}`);
  console.log(`Access Token acquired (length: ${signInData.session.access_token.length})`);

  // 4. Verify profile fetch as the authenticated user (testing RLS)
  console.log('\nTesting profile fetch using authenticated client under RLS...');
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } }
  });

  const { data: authProfile, error: authProfErr } = await authClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (authProfErr) {
    console.error('Failed to read profile as authenticated user (RLS issue):', authProfErr.message);
    process.exit(1);
  }

  console.log('Profile read successfully under RLS:');
  console.log(` - ID: ${authProfile.id}`);
  console.log(` - Email: ${authProfile.email}`);
  console.log(` - Role: ${authProfile.role}`);

  // 5. Test super admin queries (restaurants and pricing_plans)
  console.log('\nTesting dashboard queries under authenticated client...');
  const { data: rests, error: restsErr } = await authClient.from('restaurants').select('*');
  console.log('Restaurants query:', restsErr ? `Error: ${restsErr.message}` : `Success (${rests.length} rows)`);

  const { data: plans, error: plansErr } = await authClient.from('pricing_plans').select('*');
  console.log('Pricing plans query:', plansErr ? `Error: ${plansErr.message}` : `Success (${plans.length} plans: ${plans.map(p => p.id).join(', ')})`);

  console.log('\n=== SUPER ADMIN CREATION & VERIFICATION COMPLETE ===');
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
