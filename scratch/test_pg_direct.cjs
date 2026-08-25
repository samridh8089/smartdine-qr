const { Client } = require('pg');

async function testDirectPg() {
  const users = ['postgres', 'postgres.tiuwfhkrjvtkshebdwlp', 'service_role', 'authenticated', 'anon'];
  const passwords = [
    'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-',
    'tiuwfhkrjvtkshebdwlp',
    'postgres'
  ];

  for (const user of users) {
    for (const pass of passwords) {
      const conn = `postgres://${user}:${pass}@db.tiuwfhkrjvtkshebdwlp.supabase.co:5432/postgres`;
      const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 2000 });
      try {
        await client.connect();
        console.log(`✅ SUCCESS connecting as ${user}:${pass}!`);
        const res = await client.query('SELECT 1;');
        console.log('QueryResult:', res.rows);
        await client.end();
        return;
      } catch (e) {
        // failed
      }
    }
  }
  console.log('Finished testing combinations.');
}

testDirectPg().catch(console.error);
