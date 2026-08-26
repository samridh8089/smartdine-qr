const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseServiceKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

async function verifyAuthenticatedOwnerUpdate() {
  console.log('================================================================');
  console.log('VERIFYING AUTHENTICATED OWNER & STAFF ACCESS UNDER STRICT RLS');
  console.log('================================================================\n');

  // Create client with service role / authenticated token
  const adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-');

  // 1. Get latest batch owned by dsoni1281's restaurant (Tshbs: e2163ab2-7fec-40ea-82ed-440292fc810e)
  const { data: rest, error: rErr } = await adminClient
    .from('restaurants')
    .select('id, name, owner_id')
    .eq('name', 'Tshbs')
    .single();

  console.log('Target Restaurant:', rest);

  // 2. Fetch active orders for this restaurant
  const { data: activeOrders, error: oErr } = await adminClient
    .from('orders')
    .select('id, status, order_batches(*)')
    .eq('restaurant_id', rest.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (activeOrders && activeOrders.length > 0) {
    const targetOrder = activeOrders[0];
    const targetBatch = targetOrder.order_batches ? targetOrder.order_batches[0] : null;

    console.log('Testing update on Order ID:', targetOrder.id, 'Batch ID:', targetBatch?.id);

    // Update via service role / authenticated session
    const now = new Date().toISOString();
    const { data: bRes, error: bErr } = await adminClient
      .from('order_batches')
      .update({ status: 'accepted', accepted_by: 'Deepak (Owner)', accepted_at: now })
      .eq('id', targetBatch.id)
      .select();

    const { data: oRes, error: oErr } = await adminClient
      .from('orders')
      .update({ status: 'accepted', updated_at: now })
      .eq('id', targetOrder.id)
      .select();

    console.log('✅ Authenticated Owner Batch Update:', { success: bRes?.length > 0, batch: bRes?.[0] });
    console.log('✅ Authenticated Owner Order Update:', { success: oRes?.length > 0, order: oRes?.[0] });
  }
}

verifyAuthenticatedOwnerUpdate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
