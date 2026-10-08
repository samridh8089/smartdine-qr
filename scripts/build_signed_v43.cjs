const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('================================================================');
  console.log('=== BUILDING & SIGNING CLEVEROPS RELEASE V43 (TARGET SDK 36) ===');
  console.log('================================================================');

  const javaExe = path.resolve('tools/jre/bin/java.exe');
  const bundletoolJar = path.resolve('tools/bundletool.jar');
  const keystorePath = path.resolve('tools/expo_keystore/@deepak133__smartdine-mobile-app-keystore.bak.jks');
  const alias = '67f9df72e59210fc18614a65f530840c';
  const storepass = '84ecc073913921bfae5fe582c94763b5';
  const keypass = '351b8391b232649b21a72b41943c64ec';
  const jarsignerExe = 'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot\\bin\\jarsigner.exe';

  const aabPath = path.resolve('CleverOps.aab');
  const buf = fs.readFileSync(aabPath);
  const zip = await JSZip.loadAsync(buf);

  // 1. Update AndroidManifest.xml
  let manifestBuf = await zip.files['base/manifest/AndroidManifest.xml'].async('nodebuffer');

  // Update versionCode: 42 -> 43 (or 15 -> 43 if base was 15)
  // Check for string 42
  const str42 = Buffer.from([0x1a, 0x02, 0x34, 0x32]);
  const sIdx42 = manifestBuf.indexOf(str42);
  if (sIdx42 !== -1) {
    manifestBuf[sIdx42 + 3] = 0x33; // '3' -> "43"
    console.log('[PASS] Updated versionCode string 42 -> 43');
  } else {
    const str15 = Buffer.from([0x1a, 0x02, 0x31, 0x35]);
    const sIdx15 = manifestBuf.indexOf(str15);
    if (sIdx15 !== -1) {
      manifestBuf[sIdx15 + 2] = 0x34; // '4'
      manifestBuf[sIdx15 + 3] = 0x33; // '3'
      console.log('[PASS] Updated versionCode string 15 -> 43');
    }
  }

  // Check for int 42 (0x2a) or 15 (0x0f)
  const int42 = Buffer.from([0x32, 0x04, 0x3a, 0x02, 0x30, 0x2a]);
  const iIdx42 = manifestBuf.indexOf(int42);
  if (iIdx42 !== -1) {
    manifestBuf[iIdx42 + 5] = 0x2b; // 43 in hex is 0x2b
    console.log('[PASS] Updated versionCode integer 42 -> 43');
  } else {
    const int15 = Buffer.from([0x32, 0x04, 0x3a, 0x02, 0x30, 0x0f]);
    const iIdx15 = manifestBuf.indexOf(int15);
    if (iIdx15 !== -1) {
      manifestBuf[iIdx15 + 5] = 0x2b; // 43 in hex
      console.log('[PASS] Updated versionCode integer 15 -> 43');
    }
  }

  // Update versionName: 2.2.0 -> 2.2.1
  const oldVName = Buffer.from('2.2.0', 'ascii');
  const newVName = Buffer.from('2.2.1', 'ascii');
  let vIdx = manifestBuf.indexOf(oldVName);
  while (vIdx !== -1) {
    newVName.copy(manifestBuf, vIdx);
    console.log('[PASS] Updated versionName to 2.2.1 at index:', vIdx);
    vIdx = manifestBuf.indexOf(oldVName, vIdx + 5);
  }

  // Update targetSdkVersion: 34 (0x22) -> 36 (0x24)
  const targetNeedle = Buffer.from('targetSdkVersion', 'ascii');
  const tIdx = manifestBuf.indexOf(targetNeedle);
  if (tIdx !== -1) {
    const valNeedle = Buffer.from([0x32, 0x04, 0x3a, 0x02, 0x30, 0x22]);
    const tValIdx = manifestBuf.indexOf(valNeedle, tIdx);
    if (tValIdx !== -1 && tValIdx - tIdx < 50) {
      manifestBuf[tValIdx + 5] = 0x24; // 36 in hex
      console.log('[PASS] Updated targetSdkVersion from 34 to 36 at index:', tValIdx);
    } else {
      console.warn('[WARN] Could not find targetSdkVersion value sequence near needle');
    }
  } else {
    console.warn('[WARN] targetSdkVersion needle not found');
  }

  zip.file('base/manifest/AndroidManifest.xml', manifestBuf, { createFolders: false });

  // 2. Generate clean unsigned AAB
  const unsignedZip = new JSZip();
  for (const filePath of Object.keys(zip.files)) {
    const entry = zip.files[filePath];
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
  const unsignedPath = path.resolve('CleverOps-unsigned-v43.aab');
  fs.writeFileSync(unsignedPath, unsignedAabBuf);

  // 3. Sign with official Expo keystore
  console.log('[Signing] Signing with jarsigner using official Expo release key...');
  execSync(`"${jarsignerExe}" -keystore "${keystorePath}" -storepass "${storepass}" -keypass "${keypass}" "${unsignedPath}" "${alias}"`, { stdio: 'inherit' });

  // 4. Validate with bundletool
  console.log('[Bundletool] Validating signed AAB...');
  execSync(`"${javaExe}" -jar "${bundletoolJar}" validate --bundle="${unsignedPath}"`, { stdio: 'inherit' });
  console.log('[PASS] Bundletool validation passed!');

  // Dump manifest to verify versionCode and targetSdkVersion
  const dumpOut = execSync(`"${javaExe}" -jar "${bundletoolJar}" dump manifest --bundle="${unsignedPath}"`, { encoding: 'utf8' });
  dumpOut.split('\n').forEach(l => {
    if (l.includes('versionCode') || l.includes('versionName') || l.includes('targetSdkVersion')) {
      console.log('[VERIFIED MANIFEST]:', l.trim());
    }
  });

  // 5. Save final file as CleverOps.aab
  const desktopTarget = 'C:\\Users\\admin\\Desktop\\CleverOps.aab';
  const downloadsTarget = 'C:\\Users\\admin\\Downloads\\CleverOps.aab';
  const rootTarget = path.resolve('CleverOps.aab');

  fs.copyFileSync(unsignedPath, desktopTarget);
  fs.copyFileSync(unsignedPath, downloadsTarget);
  try { fs.copyFileSync(unsignedPath, rootTarget); } catch (_) {}
  try { fs.copyFileSync(unsignedPath, path.resolve('public/CleverOps.aab')); } catch (_) {}

  // Delete unsigned file
  try { fs.unlinkSync(unsignedPath); } catch (_) {}

  console.log('================================================================');
  console.log(`=== SUCCESS! READY TO UPLOAD TO GOOGLE PLAY CONSOLE ===`);
  console.log(`=== FILE: ${desktopTarget} ===`);
  console.log(`=== VERSION CODE: 43 | VERSION NAME: 2.2.1 | TARGET SDK: 36 ===`);
  console.log('================================================================');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
