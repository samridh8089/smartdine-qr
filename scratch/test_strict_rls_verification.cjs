const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseAnonKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

async function testStrictRLS() {
  console.log('================================================================');
  console.log('TESTING STRICT MULTI-TENANT RLS POLICIES FOR ORDERS & BATCHES');
  console.log('================================================================\n');

  // 1. TEST ANON ROLE (Unauthenticated)
  console.log('[STEP 1] Testing UPDATE with unauthenticated ANON client...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  const { data: bData, error: bErr } = await anonClient
    .from('order_batches')
    .update({ status: 'accepted' })
    .eq('id', '4e168aaf-7d8b-4883-a156-8ca980ff465a')
    .select();

  console.log('Anon Batch Update Result:', { count: bData?.length || 0, data: bData, error: bErr });

  if (bData && bData.length > 0) {
    console.error('❌ VULNERABILITY DETECTED: Anon user successfully updated order_batches!');
  } else {
    console.log('✅ STEP 1 SUCCESS: Anon UPDATE blocked by RLS policy! (0 rows updated)');
  }

  // 2. TEST AUTHENTICATED OWNER LOGIN (dsoni1281)
  console.log('\n[STEP 2] Signing in as real owner (dsoni1281@gmail.com)...');
  const authClient = createClient(supabaseUrl, supabaseAnonKey);

  const { data: authData, error: loginErr } = await authClient.auth.signInWithPassword({
    email: 'dsoni1281@gmail.com',
    password: 'password123' // or test token
  });

  if (loginErr) {
    console.log('Login note:', loginErr.message);
  } else {
    console.log('Authenticated User ID:', authData?.user?.id);

    const now = new Date().toISOString();
    const { data: ownerBatchData, error: ownerBatchErr } = await authClient
      .from('order_batches')
      .update({ status: 'accepted', updated_at: now })
      .eq('id', '4e168aaf-7d8b-4883-a156-8ca980ff465a')
      .select();

    console.log('Authenticated Owner Batch Update Result:', { count: ownerBatchData?.length || 0, data: ownerBatchData, error: ownerBatchErr });

    if (ownerBatchData && ownerBatchData.length > 0) {
      console.log('✅ STEP 2 SUCCESS: Authenticated restaurant owner updated order_batches successfully under RLS!');
    }
  }
}

testStrictRLS().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
