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

async function listRpcFunctions() {
  console.log('Fetching functions from Supabase schema...');
  // We can query pg_proc via postgres_changes or rpc if available
  const { data, error } = await supabase.rpc('get_service_status');
  console.log('get_service_status result:', error ? error.message : data);
}

listRpcFunctions().catch(console.error);
