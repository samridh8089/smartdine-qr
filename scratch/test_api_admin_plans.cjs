const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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

const BASE_URL = 'http://localhost:3000';

async function testApi() {
  console.log('--- TEST GET /api/admin/plans ---');
  try {
    const getRes = await fetch(`${BASE_URL}/api/admin/plans`);
    console.log('GET Status:', getRes.status, getRes.statusText);
    const getData = await getRes.json();
    console.log('GET Response success:', getData.success, 'Plans count:', getData.plans?.length);
  } catch (err) {
    console.error('GET Failed:', err);
  }

  console.log('\n--- TEST POST /api/admin/plans ---');
  try {
    const postPayload = {
      planSpec: {
        id: 'starter',
        name: 'STARTER',
        price_monthly: 499,
        price_yearly: 4990,
        limits: { tables: 6, staff_accounts: 5, outlets: 1, menu_items: 15 },
        features: { qr_menu: true, ordering: true, takeaway: true, reservations: true, live_order_tracking: true },
        ai_limits: { ai_menu_analysis: 5, ai_recipe_generation: 5, ai_review_generation: 25 }
      },
      adminUser: 'Super Admin Test',
      role: 'super_admin'
    };

    const postRes = await fetch(`${BASE_URL}/api/admin/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload)
    });

    console.log('POST Status:', postRes.status, postRes.statusText);
    const postData = await postRes.json();
    console.log('POST Response success:', postData.success, postData.message || postData.error);
  } catch (err) {
    console.error('POST Failed:', err);
  }
}

testApi();
