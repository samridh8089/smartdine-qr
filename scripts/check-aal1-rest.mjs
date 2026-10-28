import readline from 'node:readline';
const SB = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const ANON = process.env.ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

if (!ANON) { 
  console.error('Pehle chalao:  set ANON_KEY=<tumhari anon key>'); 
  process.exit(1); 
}

function ask(q, hide) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(rl.stdoutMuted ? '*' : s);
    rl.question(q, (a) => { rl.close(); console.log(''); res(a); });
    rl.stdoutMuted = hide;
  });
}

const email = await ask('Super admin email: ', false);
const password = await ask('Password: ', true);

const lr = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const lj = await lr.json();
if (!lj.access_token) { 
  console.error('Login fail:', lj.error_description || lj.msg || lj.error); 
  process.exit(1); 
}

const payload = JSON.parse(Buffer.from(lj.access_token.split('.')[1], 'base64url').toString());
console.log('Token aal =', payload.aal, '(aal1 hona chahiye)\n');

for (const t of ['restaurants','profiles','orders','order_items','order_batches','inventory_items','restaurant_expenses','pricing_plans']) {
  const selectQuery = t === 'profiles' ? 'select=id,email,role,restaurant_id&limit=10' : 'select=id&limit=3';
  const r = await fetch(`${SB}/rest/v1/${t}?${selectQuery}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${lj.access_token}` },
  });
  const j = await r.json();
  console.log(t.padEnd(22), r.status, Array.isArray(j) ? j.length + ' rows' : JSON.stringify(j).slice(0, 80));
  if (t === 'profiles' && Array.isArray(j)) {
    console.log('   Profiles returned:', JSON.stringify(j, null, 2));
  }
}
