const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
['.env.local', '.env'].forEach(file => {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [k, ...v] = trimmed.split('=');
        if (k && v.length > 0) {
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (val) process.env[k.trim()] = val;
        }
      }
    });
  }
});

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co').replace(/^["']|["']$/g, '');
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-').replace(/^["']|["']$/g, '');

async function testSessionUpdate() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('--- Attempting login to get auth token ---');
  // Attempt login with default admin credentials if available
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@cleverops.com',
    password: 'password123'
  });

  if (authErr) {
    console.log('Login error:', authErr.message);
  } else {
    console.log('✅ Logged in successfully! User ID:', authData.user?.id);
    const token = authData.session?.access_token;

    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: upData, error: upErr } = await authSupabase
      .from('pricing_plans')
      .update({ price_monthly: 499, updated_at: new Date().toISOString() })
      .eq('id', 'starter')
      .select();

    console.log('Authenticated UPDATE result count:', upData ? upData.length : 0);
    console.log('Authenticated UPDATE error:', upErr?.message || 'none');
    if (upData && upData.length > 0) {
      console.log('Updated row price_monthly:', upData[0].price_monthly);
    }
  }
}

testSessionUpdate().catch(console.error);
