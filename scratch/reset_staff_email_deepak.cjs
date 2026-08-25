const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function resetAndCreateFreshInvite() {
  const email = 'deepak.soni19492@gmail.com';
  console.log(`================================================================`);
  console.log(`CLEAN RESET AND FRESH INVITE FOR EMAIL: ${email}`);
  console.log(`================================================================\n`);

  // 1. Find all users matching email in auth.users
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  const matchingUsers = users ? users.filter(u => u.email?.toLowerCase() === email.toLowerCase()) : [];

  console.log(`Found ${matchingUsers.length} auth user(s) matching ${email}:`);
  for (const u of matchingUsers) {
    console.log(`Deleting auth user ID: ${u.id} (Created at: ${u.created_at})...`);
    
    // Delete orphan profiles row
    await supabaseAdmin.from('profiles').delete().or(`id.eq.${u.id},user_id.eq.${u.id}`);
    
    // Delete auth user
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.error(`Error deleting user ${u.id}:`, delErr.message);
    } else {
      console.log(`✅ Deleted user ${u.id} from auth.users successfully.`);
    }
  }

  // Delete any orphan profiles matching email directly
  const { data: orphanProfs } = await supabaseAdmin.from('profiles').delete().eq('email', email).select();
  console.log(`Deleted orphan profiles matching ${email}:`, orphanProfs?.length || 0);

  // 2. Fetch Owner Restaurant ID (Tshbs / dsoni1281)
  const { data: ownerProf } = await supabaseAdmin
    .from('profiles')
    .select('restaurant_id')
    .eq('email', 'dsoni1281@gmail.com')
    .maybeSingle();

  const restaurantId = ownerProf?.restaurant_id || 'e2163ab2-7fec-40ea-82ed-440292fc810e';
  console.log(`Using Restaurant ID: ${restaurantId}`);

  // 3. Create Fresh Staff Invite
  console.log(`\nCreating fresh staff invite for ${email}...`);
  const createRes = await fetch('https://www.cleverops.in/api/staff/create-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Deepak Soni',
      email,
      phone: '8949266064',
      password: 'Password123!',
      role: 'kitchen',
      department: 'kitchen',
      restaurantId
    })
  }).then(r => r.json());

  console.log('\nFresh Staff Invite Response:', createRes);
}

resetAndCreateFreshInvite().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
