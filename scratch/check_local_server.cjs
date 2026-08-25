const http = require('http');

function checkLocalServer(port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve({ running: true, statusCode: res.statusCode });
    });
    req.on('error', () => {
      resolve({ running: false });
    });
    req.end();
  });
}

async function main() {
  const status3000 = await checkLocalServer(3000);
  console.log('Local server status on port 3000:', status3000);
}

main().catch(console.error);
