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

async function testRpcSignatures() {
  const testSql = 'SELECT 1;';

  const paramsToTry = [
    { query: testSql },
    { sql: testSql },
    { sql_query: testSql },
    { p_sql: testSql },
    { query_text: testSql }
  ];

  for (const p of paramsToTry) {
    const keyName = Object.keys(p)[0];
    const { data, error } = await supabase.rpc('exec_sql', p);
    if (error) {
      console.log(`rpc('exec_sql', { ${keyName} }) -> ${error.message}`);
    } else {
      console.log(`✅ MATCH! rpc('exec_sql', { ${keyName} }) WORKED!`);
    }
  }

  // Also try execute_sql
  for (const p of paramsToTry) {
    const keyName = Object.keys(p)[0];
    const { data, error } = await supabase.rpc('execute_sql', p);
    if (error) {
      console.log(`rpc('execute_sql', { ${keyName} }) -> ${error.message}`);
    } else {
      console.log(`✅ MATCH! rpc('execute_sql', { ${keyName} }) WORKED!`);
    }
  }
}

testRpcSignatures().catch(console.error);
