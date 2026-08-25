const { Client } = require('pg');

async function testHosts() {
  const hosts = [
    'db.tiuwfhkrjvtkshebdwlp.supabase.co:5432',
    'aws-0-ap-south-1.pooler.supabase.com:5432',
    'aws-0-ap-south-1.pooler.supabase.com:6543',
    'aws-0-ap-southeast-1.pooler.supabase.com:5432',
    'aws-0-ap-southeast-1.pooler.supabase.com:6543'
  ];

  for (const host of hosts) {
    const conn = `postgres://postgres.tiuwfhkrjvtkshebdwlp:sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-@${host}/postgres`;
    const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
    try {
      await client.connect();
      console.log(`✅ SUCCESS connecting to ${host}!`);
      const res = await client.query('SELECT 1;');
      console.log('QueryResult:', res.rows);
      await client.end();
      return host;
    } catch (e) {
      console.log(`Host ${host} -> ${e.message}`);
    }
  }
}

testHosts().catch(console.error);
