const { Client } = require('pg');

async function inspectPolicies() {
  const connectionString = 'postgres://postgres.tiuwfhkrjvtkshebdwlp:sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- DB POLICIES FOR PRICING_PLANS, PROFILES, AUDIT_LOGS ---');

    const res = await client.query(`
      SELECT tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('pricing_plans', 'profiles', 'audit_logs', 'restaurants');
    `);

    console.log(JSON.stringify(res.rows, null, 2));

    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname IN ('pricing_plans', 'profiles', 'audit_logs', 'restaurants');
    `);
    console.log('\n--- RLS ENABLED STATUS ---');
    console.log(JSON.stringify(rlsRes.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspectPolicies().catch(console.error);
