import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function inspectProfilesAdmin() {
  console.log('==================================================');
  console.log('PROFILES TABLE AUDIT VIA ADMIN CLIENT');
  console.log('==================================================\n');

  const { data: profiles, error } = await supabaseAdmin.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Total Profiles in DB: ${profiles?.length || 0}`);
  if (profiles && profiles.length > 0) {
    console.log('Sample Profile Columns:', Object.keys(profiles[0]));
    profiles.forEach(p => {
      console.log(`- ID: ${p.id} | Email: ${p.email} | Name: ${p.full_name} | Role: ${p.role} | RestaurantID: ${p.restaurant_id}`);
    });
  }

  console.log('\n--- SUPABASE AUTH USERS ---');
  const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
  if (authErr) {
    console.error('Error fetching auth users:', authErr);
  } else {
    console.log(`Total Auth Users: ${authUsers.users.length}`);
    authUsers.users.forEach(u => {
      console.log(`- Auth ID: ${u.id} | Email: ${u.email} | Metadata:`, u.user_metadata);
    });
  }
}

inspectProfilesAdmin().catch(err => console.error(err));
