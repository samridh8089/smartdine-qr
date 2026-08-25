const { Client } = require('pg');

async function testPgConnection() {
  const connectionString = 'postgres://postgres.tiuwfhkrjvtkshebdwlp:sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Postgres pooler successfully!');
    const res = await client.query('SELECT current_database(), current_user;');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testPgConnection().catch(console.error);
