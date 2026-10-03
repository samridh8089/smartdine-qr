const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  const out = execSync('npx eas-cli build:view 5344bbc4-e183-4f1e-b7a9-8cf0e401a460 --json', { cwd: 'smartdine-mobile' });
  const json = JSON.parse(out.toString());
  const url = json.logFiles[0];
  const res = await fetch(url);
  const text = await res.text();
  fs.writeFileSync('eas_log_plain.txt', text);
  console.log('Successfully fetched log! Lines:', text.split('\n').length);
}

main().catch(console.error);
