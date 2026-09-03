import { createClient } from '@supabase/supabase-js';

async function main() {
  const client = createClient(
    'https://tiuwfhkrjvtkshebdwlp.supabase.co',
    'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-'
  );
  const { data, error } = await client
    .from('otp_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('OTP Sessions count:', data?.length, 'Error:', error?.message);
  data?.forEach(d => {
    console.log(` - Target: ${d.target} | Type: ${d.type} | Verified: ${d.verified} | Created: ${d.created_at}`);
  });
}

main();
