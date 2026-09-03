import { createClient } from '@supabase/supabase-js';

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('Key exists in env:', Boolean(key));
if (key) {
  console.log('Key length:', key.length);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
  const supabase = createClient(supabaseUrl, key);
  const { data, error } = await supabase.from('tables').select('id').limit(1);
  console.log('Supabase query result: error=', error?.message || 'null', 'count=', data?.length);
}
