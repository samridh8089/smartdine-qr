const fs = require('fs');

// 1. app.json
const appJsonPath = 'smartdine-mobile/app.json';
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

appJson.expo.version = '2.1.6';
appJson.expo.android.versionCode = 63;
if (appJson.expo.runtimeVersion) {
  appJson.expo.runtimeVersion = '2.1.6';
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log('Updated app.json to version 2.1.6 (versionCode: 63)');

// 2. package.json
const pkgPath = 'smartdine-mobile/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '2.1.6';

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('Updated package.json to version 2.1.6');
