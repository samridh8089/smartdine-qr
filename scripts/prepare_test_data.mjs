import fs from 'fs';

async function run() {
  const PROD_URL = 'https://www.cleverops.in';
  const restId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
  
  // 1. Check live sync data
  const syncRes = await fetch(`${PROD_URL}/api/admin/live-sync?restaurantId=${restId}`);
  const sync = await syncRes.json();
  console.log('LIVE SYNC DATA:');
  console.log('Stats:', sync.stats);
  console.log('Tables:', sync.tables?.map(t => ({ id: t.id, name: t.name, status: t.status })));
  console.log('Active orders:', sync.activeOrders);

  // 2. Fetch public menu to get a real menu item ID
  const menuRes = await fetch(`${PROD_URL}/menu/the-foody-hub`);
  const html = await menuRes.text();
  const idMatches = [...html.matchAll(/"id":"([0-9a-fA-F-]{36})"/g)].map(m => m[1]);
  console.log('Potential menu item IDs:', idMatches.slice(0, 10));

  fs.writeFileSync('scripts/test_context.json', JSON.stringify({
    restaurantId: restId,
    tables: sync.tables,
    firstTable: sync.tables?.[0],
    sampleIds: idMatches
  }, null, 2));
  console.log('Saved test context');
}

run().catch(console.error);
