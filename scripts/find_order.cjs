const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tiuwfhkrjvtkshebdwlp.supabase.co',
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
);

async function find() {
  const { data: ord } = await supabase.from('orders').select('*').eq('id', '7ab63bf1-a676-4e70-b7f4-4e823c71982a').single();
  console.log('Order 7ab63bf1:', ord);
}

find().catch(console.error);
