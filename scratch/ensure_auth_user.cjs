const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_REST_ID = 'c1853f65-c10c-4f8a-b379-00a60f404ef9'; // The foody hub
const TEST_EMAIL = 'owner_qa_foodyhub@cleverops.in';
const TEST_PASS = 'TestOwner123!';

async function ensureAuthUser() {
  console.log('=== ENSURING AUTH OWNER USER FOR THE FOODY HUB ===\n');

  // Check if sign in works
  let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS
  });

  if (signInErr || !signInData.user) {
    console.log('Creating new Auth User:', TEST_EMAIL);
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASS,
      options: {
        data: {
          fullName: 'The Foody Hub Owner',
          role: 'owner'
        }
      }
    });

    if (signUpErr) {
      console.error('Sign Up Error:', signUpErr);
      return;
    }

    const userId = signUpData.user.id;
    console.log('User created with ID:', userId);

    // Create profile entry linked to target restaurant
    await supabase.from('profiles').upsert({
      id: userId,
      restaurant_id: TARGET_REST_ID,
      email: TEST_EMAIL,
      full_name: 'The Foody Hub Owner',
      role: 'owner'
    });
    console.log('✅ Created Profile record for owner ID:', userId);
  } else {
    const userId = signInData.user.id;
    console.log('✅ Existing Auth User verified:', userId);
    await supabase.from('profiles').upsert({
      id: userId,
      restaurant_id: TARGET_REST_ID,
      email: TEST_EMAIL,
      full_name: 'The Foody Hub Owner',
      role: 'owner'
    });
    console.log('✅ Profile linked to restaurant:', TARGET_REST_ID);
  }
}

ensureAuthUser().catch(console.error);
