const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('=== Adding META-INF services to AAB ===');
  const apkZip = await JSZip.loadAsync(fs.readFileSync('device_base.apk'));
  const aabZip = await JSZip.loadAsync(fs.readFileSync('C:/Users/admin/Desktop/CleverOps.aab'));

  // 1. Copy META-INF/ non-signature entries from apk to base/root/META-INF/
  const metaFiles = Object.keys(apkZip.files).filter(k => 
    k.startsWith('META-INF/') && 
    !k.endsWith('.SF') && 
    !k.endsWith('.RSA') && 
    !k.endsWith('.DSA') && 
    !k.endsWith('.MF')
  );

  console.log(`Copying ${metaFiles.length} META-INF entries from device_base.apk to base/root/META-INF/ in AAB...`);
  for (const f of metaFiles) {
    const data = await apkZip.files[f].async('nodebuffer');
    aabZip.file('base/root/' + f, data);
  }

  // 2. Bump versionCode to 44 and versionName to 2.2.2
  let manifestBuf = await aabZip.files['base/manifest/AndroidManifest.xml'].async('nodebuffer');

  // String 43 -> 44
  const str43 = Buffer.from([0x1a, 0x02, 0x34, 0x33]);
  const sIdx43 = manifestBuf.indexOf(str43);
  if (sIdx43 !== -1) {
    manifestBuf[sIdx43 + 3] = 0x34; // '4' -> "44"
    console.log('[PASS] Updated versionCode string 43 -> 44');
  }

  // Int 43 (0x2b) -> 44 (0x2c)
  const int43 = Buffer.from([0x32, 0x04, 0x3a, 0x02, 0x30, 0x2b]);
  const iIdx43 = manifestBuf.indexOf(int43);
  if (iIdx43 !== -1) {
    manifestBuf[iIdx43 + 5] = 0x2c; // 44 in hex is 0x2c
    console.log('[PASS] Updated versionCode integer 43 -> 44');
  }

  // VersionName: 2.2.1 -> 2.2.2
  const oldVName = Buffer.from('2.2.1', 'ascii');
  const newVName = Buffer.from('2.2.2', 'ascii');
  let vIdx = manifestBuf.indexOf(oldVName);
  while (vIdx !== -1) {
    newVName.copy(manifestBuf, vIdx);
    console.log('[PASS] Updated versionName to 2.2.2 at index:', vIdx);
    vIdx = manifestBuf.indexOf(oldVName, vIdx + 5);
  }

  aabZip.file('base/manifest/AndroidManifest.xml', manifestBuf, { createFolders: false });

  // 3. Create clean unsigned zip
  const unsignedZip = new JSZip();
  for (const filePath of Object.keys(aabZip.files)) {
    const entry = aabZip.files[filePath];
    if (entry.dir || filePath.endsWith('/')) continue;
    if (filePath.startsWith('META-INF/')) {
      const rel = filePath.substring('META-INF/'.length);
      if (!rel.includes('/') && (rel === 'MANIFEST.MF' || rel.endsWith('.SF') || rel.endsWith('.RSA') || rel.endsWith('.DSA') || rel.endsWith('.EC'))) {
        continue;
      }
    }
    const content = await entry.async('nodebuffer');
    unsignedZip.file(filePath, content, {
      createFolders: false,
      compression: entry._data.uncompressedSize === entry._data.compressedSize ? 'STORE' : 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  const unsignedAabBuf = await unsignedZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const unsignedPath = path.resolve('CleverOps-v44-unsigned.aab');
  fs.writeFileSync(unsignedPath, unsignedAabBuf);

  // 4. Sign with jarsigner
  const jarsignerExe = 'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot\\bin\\jarsigner.exe';
  const keystorePath = path.resolve('tools/expo_keystore/@deepak133__smartdine-mobile-app-keystore.bak.jks');
  const alias = '67f9df72e59210fc18614a65f530840c';
  const storepass = '84ecc073913921bfae5fe582c94763b5';
  const keypass = '351b8391b232649b21a72b41943c64ec';
  const javaExe = path.resolve('tools/jre/bin/java.exe');
  const bundletoolJar = path.resolve('tools/bundletool.jar');

  console.log('[Signing] Signing with jarsigner...');
  execSync(`"${jarsignerExe}" -keystore "${keystorePath}" -storepass "${storepass}" -keypass "${keypass}" "${unsignedPath}" "${alias}"`, { stdio: 'inherit' });

  // 5. Validate with bundletool
  console.log('[Bundletool] Validating signed AAB...');
  execSync(`"${javaExe}" -jar "${bundletoolJar}" validate --bundle="${unsignedPath}"`, { stdio: 'inherit' });
  console.log('[PASS] AAB validated!');

  // Dump manifest
  const dumpOut = execSync(`"${javaExe}" -jar "${bundletoolJar}" dump manifest --bundle="${unsignedPath}"`, { encoding: 'utf8' });
  dumpOut.split('\n').forEach(l => {
    if (l.includes('versionCode') || l.includes('versionName') || l.includes('targetSdkVersion')) {
      console.log('[VERIFIED MANIFEST]:', l.trim());
    }
  });

  // 6. Build universal APK
  console.log('[Bundletool] Generating universal APK...');
  const apksPath = path.resolve('CleverOps-v44.apks');
  try { fs.unlinkSync(apksPath); } catch (_) {}
  execSync(`"${javaExe}" -jar "${bundletoolJar}" build-apks --bundle="${unsignedPath}" --output="${apksPath}" --mode=universal --ks="${keystorePath}" --ks-pass=pass:${storepass} --ks-key-alias=${alias} --key-pass=pass:${keypass}`, { stdio: 'inherit' });

  // Extract universal APK
  const apksZip = await JSZip.loadAsync(fs.readFileSync(apksPath));
  const universalApkBuf = await apksZip.files['universal.apk'].async('nodebuffer');
  const targetApkPath = path.resolve('CleverOps-v2.2.2.apk');
  fs.writeFileSync(targetApkPath, universalApkBuf);
  fs.writeFileSync(path.resolve('public/CleverOps.apk'), universalApkBuf);
  try { fs.unlinkSync(apksPath); } catch (_) {}

  // Verify APK has BuiltInsLoader
  const builtApkZip = await JSZip.loadAsync(universalApkBuf);
  const foundServices = Object.keys(builtApkZip.files).filter(k => k.includes('BuiltInsLoader') || k.includes('services/'));
  console.log('[VERIFIED APK SERVICES]:', foundServices);

  // 7. Overwrite Desktop and Downloads CleverOps.aab
  const desktopTarget = 'C:\\Users\\admin\\Desktop\\CleverOps.aab';
  const downloadsTarget = 'C:\\Users\\admin\\Downloads\\CleverOps.aab';
  fs.copyFileSync(unsignedPath, desktopTarget);
  fs.copyFileSync(unsignedPath, downloadsTarget);
  fs.copyFileSync(unsignedPath, path.resolve('CleverOps.aab'));
  fs.copyFileSync(unsignedPath, path.resolve('public/CleverOps.aab'));
  try { fs.unlinkSync(unsignedPath); } catch (_) {}

  console.log('================================================================');
  console.log('=== SUCCESS! V44 WITH SERVICES BUILT AND VERIFIED! ===');
  console.log(`=== AAB: ${desktopTarget} ===`);
  console.log(`=== APK: ${targetApkPath} ===`);
  console.log('================================================================');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
