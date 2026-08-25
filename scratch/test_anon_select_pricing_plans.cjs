const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function testAnonSelect() {
  console.log('--- TESTING CLIENT ANON SELECT FROM pricing_plans ---');
  const { data, error } = await supabaseAnon.from('pricing_plans').select('*').eq('id', 'starter').maybeSingle();
  console.log('Error:', error);
  console.log('Data fetched by anon client:', data);
}

testAnonSelect();
