const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { execSync } = require('child_process');

async function buildAll() {
  console.log('=== 1. PREPARING AAB V60 (versionCode: 60, versionName: 2.2.7) ===');
  const aabPath = path.resolve('CleverOps.aab');
  const aabZip = await JSZip.loadAsync(fs.readFileSync(aabPath));

  // Update AndroidManifest.xml
  let manifestBuf = await aabZip.files['base/manifest/AndroidManifest.xml'].async('nodebuffer');

  const vIdx = manifestBuf.indexOf(Buffer.from('versionCode'));
  if (vIdx === -1) throw new Error('versionCode attribute not found in manifest!');

  // Set string '60'
  manifestBuf[vIdx + 13] = 0x36; // '6'
  manifestBuf[vIdx + 14] = 0x30; // '0'
  console.log('Updated string versionCode to 60 at offset', vIdx + 13);

  // Set int 60 (0x3c)
  manifestBuf[vIdx + 26] = 0x30;
  manifestBuf[vIdx + 27] = 0x3c; // 0x3c = 60 decimal
  console.log('Updated int versionCode to 60 (0x3c) at offset', vIdx + 26);

  // Update versionName to '2.2.7'
  for (const oldVer of ['2.2.6', '2.2.5', '2.2.4', '2.2.3']) {
    const oldBuf = Buffer.from(oldVer, 'ascii');
    const newBuf = Buffer.from('2.2.7', 'ascii');
    let vi = manifestBuf.indexOf(oldBuf);
    while (vi !== -1) {
      newBuf.copy(manifestBuf, vi);
      console.log(`Updated versionName ${oldVer} to 2.2.7 at offset`, vi);
      vi = manifestBuf.indexOf(oldBuf, vi + 5);
    }
  }

  aabZip.file('base/manifest/AndroidManifest.xml', manifestBuf);

  // Update bundle with the verified bundle containing RNCWebViewMessagingModule
  const bundlePath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
  const bundleContent = fs.readFileSync(bundlePath, 'utf8');
  if (!bundleContent.includes('RNCWebViewMessagingModule')) {
    throw new Error('Bundle does not contain verified RNCWebViewMessagingModule!');
  }
  aabZip.file('base/assets/index.android.bundle', fs.readFileSync(bundlePath));
  console.log('Embedded 100% verified bundle with RNCWebViewMessagingModule!');

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

  console.log('\n=== 5. COPYING AAB TO DESTINATIONS ===');
  const releaseAab = path.resolve('CleverOps-release.aab');
  const dlAab = 'C:/Users/dsoni/Downloads/CleverOps-release.aab';
  const pubAab = path.resolve('public/CleverOps.aab');
  fs.copyFileSync(unsignedAabPath, releaseAab);
  fs.copyFileSync(unsignedAabPath, dlAab);
  fs.copyFileSync(unsignedAabPath, pubAab);
  fs.unlinkSync(unsignedAabPath);

  // Check manifest dump
  const manifestCmd = `"${java}" -jar "${bundletool}" dump manifest --bundle="${releaseAab}"`;
  const manifestOut = execSync(manifestCmd, { encoding: 'utf8' });
  console.log('Manifest first line:');
  console.log(manifestOut.split('\n')[0]);

  console.log('\n=== 6. GENERATING UNIVERSAL APK VIA BUNDLETOOL ===');
  const apks = path.resolve('CleverOps.apks');
  if (fs.existsSync(apks)) fs.unlinkSync(apks);

  const buildApksCmd = `"${java}" -jar "${bundletool}" build-apks --bundle="${releaseAab}" --output="${apks}" --mode=universal --ks="${keystore}" --ks-pass=pass:${storepass} --ks-key-alias="${alias}" --key-pass=pass:${keypass}`;
  execSync(buildApksCmd, { stdio: 'inherit' });

  execSync(`tar -xf "${apks}" universal.apk`, { stdio: 'inherit' });
  if (fs.existsSync('universal.apk')) {
    fs.copyFileSync('universal.apk', 'CleverOps-universal.apk');
    fs.copyFileSync('universal.apk', 'C:/Users/dsoni/Downloads/CleverOps-universal.apk');
    fs.copyFileSync('universal.apk', 'public/CleverOps-universal.apk');
    fs.unlinkSync('universal.apk');
    fs.unlinkSync(apks);
    console.log('Universal APK saved to Downloads, public, and project root!');
  }

  // Update mtime of downloads files
  const now = new Date();
  fs.utimesSync(dlAab, now, now);
  fs.utimesSync('C:/Users/dsoni/Downloads/CleverOps-universal.apk', now, now);

  console.log('\n=== 7. INSTALLING TO PHONE VIA ADB ===');
  const adb = path.resolve('tools/platform-tools/adb.exe');
  execSync(`"${adb}" install -r CleverOps-universal.apk`, { stdio: 'inherit' });

  console.log('\n=== 8. LAUNCHING APP ON PHONE ===');
  execSync(`"${adb}" shell am start -n cleverops.app.in/com.smartdine.mobile.MainActivity`, { stdio: 'inherit' });
  console.log('App launched on phone successfully!');
}

buildAll().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
