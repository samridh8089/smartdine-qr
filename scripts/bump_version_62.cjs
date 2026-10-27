const fs = require('fs');

// 1. app.json
const appJsonPath = 'smartdine-mobile/app.json';
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = '2.1.5';
appJson.expo.android.versionCode = 62;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log('app.json bumped to version 2.1.5, versionCode 62');

// 2. package.json
const pkgPath = 'smartdine-mobile/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '2.1.5';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
console.log('smartdine-mobile/package.json bumped to 2.1.5');
