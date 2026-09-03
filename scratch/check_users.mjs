import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Total auth users:', users.length);
  users.forEach(u => {
    console.log(` - ID: ${u.id} | Email: ${u.email} | Confirmed: ${!!u.email_confirmed_at}`);
  });

  const { data: profs } = await supabase.from('profiles').select('*');
  console.log('\nTotal profiles:', profs?.length);
  profs?.forEach(p => {
    console.log(` - ${p.email} | Role: ${p.role} | RestId: ${p.restaurant_id} | Password: ${p.plain_password}`);
  });
}

main();
