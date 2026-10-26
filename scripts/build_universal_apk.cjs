const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const java = path.resolve('tools/jdk-17.0.20.1+1/bin/java.exe');
const bundletool = path.resolve('tools/bundletool.jar');
const aab = path.resolve('CleverOps-release.aab');
const apks = path.resolve('CleverOps.apks');
const keystore = path.resolve('tools/expo_keystore/cleverops_upload.jks');
const storepass = '84ecc073913921bfae5fe582c94763b5';
const keypass = '351b8391b232649b21a72b41943c64ec';
const alias = '67f9df72e59210fc18614a65f530840c';

if (fs.existsSync(apks)) fs.unlinkSync(apks);

console.log('Generating universal APK from CleverOps-release.aab using bundletool...');
const cmd = `"${java}" -jar "${bundletool}" build-apks --bundle="${aab}" --output="${apks}" --mode=universal --ks="${keystore}" --ks-pass=pass:${storepass} --ks-key-alias="${alias}" --key-pass=pass:${keypass}`;
execSync(cmd, { stdio: 'inherit' });

console.log('Extracting universal.apk from CleverOps.apks...');
execSync(`tar -xf "${apks}" universal.apk`, { stdio: 'inherit' });

if (fs.existsSync('universal.apk')) {
  const stat = fs.statSync('universal.apk');
  console.log('universal.apk generated successfully! Size: ' + (stat.size / 1024 / 1024).toFixed(2) + ' MB');
  fs.copyFileSync('universal.apk', 'CleverOps-universal.apk');
  fs.copyFileSync('universal.apk', 'C:/Users/dsoni/Downloads/CleverOps-universal.apk');
  fs.copyFileSync('universal.apk', 'public/CleverOps-universal.apk');
  fs.unlinkSync('universal.apk');
  fs.unlinkSync(apks);
  console.log('Saved to project root, Downloads, and public directory!');
}
