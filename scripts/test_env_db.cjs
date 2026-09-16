const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
const env = {};
content.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
});

console.log('SUPABASE_URL:', env.NEXT_PUBLIC_SUPABASE_URL);
console.log('ANON_KEY prefix:', (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').slice(0, 15));
console.log('SERVICE_ROLE_KEY prefix:', (env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 15));

const { createClient } = require('@supabase/supabase-js');
const sbAnon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const sbService = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('\n--- TESTING WITH ANON KEY ---');
  const { data: anonData, error: anonErr } = await sbAnon.from('restaurants').select('id, name, slug').eq('id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae').maybeSingle();
  console.log('Anon Result:', anonData, 'Error:', anonErr);

  console.log('\n--- TESTING WITH SERVICE KEY ---');
  const { data: servData, error: servErr } = await sbService.from('restaurants').select('id, name, slug').eq('id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae').maybeSingle();
  console.log('Service Result:', servData, 'Error:', servErr);
})();
