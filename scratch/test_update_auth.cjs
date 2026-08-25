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
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdateAuth() {
  console.log('Testing UPDATE with anon key on pricing_plans...');

  const { data, error, count } = await supabase
    .from('pricing_plans')
    .update({ price_monthly: 499, updated_at: new Date().toISOString() })
    .eq('id', 'starter')
    .select();

  console.log('Update return data:', data);
  console.log('Update error:', error);

  const { data: fetchRow } = await supabase.from('pricing_plans').select('*').eq('id', 'starter').single();
  console.log('Fetched row price_monthly:', fetchRow?.price_monthly);
}

testUpdateAuth().catch(console.error);
