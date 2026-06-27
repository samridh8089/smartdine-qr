const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const email = `test_jwt_${Math.random().toString(36).substr(2, 5)}@smartdine.com`;
  const password = 'Password123!';
  
  console.log('Signing up user...');
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        fullName: 'Test Owner',
        restaurantName: 'Test Rest',
        slug: 'test-rest-' + Math.random().toString(36).substr(2, 5),
        phone: '+1 555-555-5555',
        role: 'owner'
      }
    }
  });

  if (signUpErr) {
    console.error('Signup failed:', signUpErr.message);
    process.exit(1);
  }

  // Wait 3 seconds for the post-signup database trigger to run
  await new Promise(r => setTimeout(r, 3000));

  console.log('Signing in...');
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInErr) {
    console.error('Signin failed:', signInErr.message);
    process.exit(1);
  }

  console.log('User Metadata at signin:', signInData.user.user_metadata);

  console.log('Querying profile using authenticated user session...');
  const { data: profile, error: profErr } = await supabase.from('profiles').select('*');
  console.log('Profile result:', profile, profErr);

  process.exit(0);
}

check();
