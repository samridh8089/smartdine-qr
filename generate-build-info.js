const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'build-info.json');

if (!fs.existsSync(filePath)) {
  const dummyInfo = {
    commit: "local-dev",
    buildTime: new Date().toISOString(),
    env: "development",
    schemaVersion: "20260701000000_storage_setup"
  };
  fs.writeFileSync(filePath, JSON.stringify(dummyInfo, null, 2));
}

console.log('Build info verified/generated successfully.');
