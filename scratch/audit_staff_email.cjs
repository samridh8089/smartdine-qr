const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditStaffEmail() {
  const email = 'deepak.soni9492@gmail.com';
  console.log(`================================================================`);
  console.log(`AUDITING AUTH & STAFF RECORDS FOR EMAIL: ${email}`);
  console.log(`================================================================\n`);

  // 1. Check auth.users via admin API
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  
  const authUser = users ? users.find(u => u.email?.toLowerCase() === email.toLowerCase()) : null;

  console.log('--- 1. AUTH.USERS RESULT ---');
  if (authUser) {
    console.log({
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at,
      confirmation_sent_at: authUser.confirmation_sent_at,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at
    });
  } else {
    console.log('No user found in auth.users');
  }

  // 2. Check profiles
  console.log('\n--- 2. PROFILES RESULT ---');
  let userUuid = authUser?.id;

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, user_id, restaurant_id, role, full_name, email, created_at')
    .or(`email.eq.${email}${userUuid ? `,user_id.eq.${userUuid},id.eq.${userUuid}` : ''}`);

  console.log('Profiles found:', profiles || [], pErr || '');

  // 3. Check staff_profiles
  console.log('\n--- 3. STAFF_PROFILES RESULT ---');
  const { data: staffProfiles, error: sErr } = await supabase
    .from('staff_profiles')
    .select('id, user_id, restaurant_id, role, status, pin, email, created_at')
    .or(`email.eq.${email}${userUuid ? `,user_id.eq.${userUuid}` : ''}`);

  console.log('Staff Profiles found:', staffProfiles || [], sErr || '');
}

auditStaffEmail().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
