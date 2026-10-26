const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { execSync } = require('child_process');

async function buildAndSignV48() {
  console.log('=== 1. PREPARING AAB V48 (versionName: 2.2.5) ===');
  const aabPath = path.resolve('CleverOps.aab');
  const aabZip = await JSZip.loadAsync(fs.readFileSync(aabPath));

  // Update AndroidManifest.xml
  let manifestBuf = await aabZip.files['base/manifest/AndroidManifest.xml'].async('nodebuffer');
  
  // Search for string '46'
  const str46 = Buffer.from([0x1a, 0x02, 0x34, 0x36]);
  const sIdx = manifestBuf.indexOf(str46);
  if (sIdx !== -1) {
    manifestBuf[sIdx + 3] = 0x38; // '8' -> '48'
    console.log('Updated string versionCode to 48 at offset', sIdx);
  } else {
    console.warn('WARNING: str46 not found!');
  }

  // Search for int 46 (0x2e)
  const int46 = Buffer.from([0x32, 0x04, 0x3a, 0x02, 0x30, 0x2e]);
  const iIdx = manifestBuf.indexOf(int46);
  if (iIdx !== -1) {
    manifestBuf[iIdx + 5] = 0x30; // 0x30 = 48 decimal
    console.log('Updated int versionCode to 48 (0x30) at offset', iIdx);
  } else {
    console.warn('WARNING: int46 not found!');
  }

  // Update versionName '2.2.4' -> '2.2.5'
  const v4 = Buffer.from('2.2.4', 'ascii');
  const v5 = Buffer.from('2.2.5', 'ascii');
  let vi = manifestBuf.indexOf(v4);
  while (vi !== -1) {
    v5.copy(manifestBuf, vi);
    console.log('Updated versionName to 2.2.5 at offset', vi);
    vi = manifestBuf.indexOf(v4, vi + 5);
  }

  aabZip.file('base/manifest/AndroidManifest.xml', manifestBuf);

  // Update bundle with the latest web container bundle
  const bundlePath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
  aabZip.file('base/assets/index.android.bundle', fs.readFileSync(bundlePath));

  // Build clean zip without folder entries and META-INF signatures
  const cleanZip = new JSZip();
  for (const f of Object.keys(aabZip.files)) {
    if (f.startsWith('META-INF/') || aabZip.files[f].dir || f.endsWith('/')) {
      continue;
    }
    const c = await aabZip.files[f].async('nodebuffer');
    cleanZip.file(f, c, { createFolders: false });
  }

  const unsignedAabBuf = await cleanZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const unsignedAabPath = path.resolve('temp_unsigned.aab');
  fs.writeFileSync(unsignedAabPath, unsignedAabBuf);
  console.log('Created unsigned AAB:', unsignedAabPath, '(' + (unsignedAabBuf.length / 1024 / 1024).toFixed(2) + ' MB)');

  console.log('\n=== 2. SIGNING AAB WITH OFFICIAL EXPO KEYSTORE ===');
  const jarsigner = path.resolve('tools/jdk-17.0.20.1+1/bin/jarsigner.exe');
  const keystore = path.resolve('tools/expo_keystore/cleverops_upload.jks');
  const storepass = '84ecc073913921bfae5fe582c94763b5';
  const keypass = '351b8391b232649b21a72b41943c64ec';
  const alias = '67f9df72e59210fc18614a65f530840c';

  const signCmd = `"${jarsigner}" -keystore "${keystore}" -storepass "${storepass}" -keypass "${keypass}" -sigalg SHA256withRSA -digestalg SHA-256 "${unsignedAabPath}" "${alias}"`;
  execSync(signCmd, { stdio: 'inherit' });
  console.log('Signed successfully with jarsigner!');

  console.log('\n=== 3. VERIFYING SIGNATURE ===');
  const verifyCmd = `"${jarsigner}" -verify -verbose -certs "${unsignedAabPath}"`;
  const verifyOut = execSync(verifyCmd, { encoding: 'utf8' });
  const isVerified = verifyOut.includes('jar verified.');
  console.log('Jar verified:', isVerified);

  console.log('\n=== 4. VALIDATING WITH BUNDLETOOL ===');
  const java = path.resolve('tools/jdk-17.0.20.1+1/bin/java.exe');
  const bundletool = path.resolve('tools/bundletool.jar');
  const validateCmd = `"${java}" -jar "${bundletool}" validate --bundle="${unsignedAabPath}"`;
  execSync(validateCmd, { stdio: 'inherit' });
  console.log('Bundletool validation: SUCCESSFUL!');

  console.log('\n=== 5. COPYING TO DESTINATIONS ===');
  const releaseAab = path.resolve('CleverOps-release.aab');
  const dlAab = 'C:/Users/dsoni/Downloads/CleverOps-release.aab';
  const pubAab = path.resolve('public/CleverOps.aab');
  fs.copyFileSync(unsignedAabPath, releaseAab);
  fs.copyFileSync(unsignedAabPath, dlAab);
  fs.copyFileSync(unsignedAabPath, pubAab);
  fs.unlinkSync(unsignedAabPath);

  console.log('Done! Release AAB saved to:');
  console.log('- ' + releaseAab);
  console.log('- ' + dlAab);
  console.log('- ' + pubAab);

  // Check manifest dump
  console.log('\n=== 6. VERIFYING MANIFEST IN OUTPUT BUNDLE ===');
  const manifestCmd = `"${java}" -jar "${bundletool}" dump manifest --bundle="${releaseAab}"`;
  const manifestOut = execSync(manifestCmd, { encoding: 'utf8' });
  const firstLine = manifestOut.split('\n')[0];
  console.log('Manifest first line:');
  console.log(firstLine);
}

buildAndSignV48().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
