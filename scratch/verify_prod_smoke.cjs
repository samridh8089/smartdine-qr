const https = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ url, status: 'ERROR', error: err.message });
    });
  });
}

async function runSmokeTest() {
  const root = await checkUrl('https://www.cleverops.in/');
  const inventory = await checkUrl('https://www.cleverops.in/dashboard/inventory');
  console.log('Production URL:', root.url, 'Status:', root.status);
  console.log('Inventory Route:', inventory.url, 'Status:', inventory.status);
}

runSmokeTest();
