import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { execSync } from 'child_process';

async function packageApk() {
  console.log('=== Packaging CleverOps Production APK v2.1.0 (versionCode 14) ===');

  const origApkPath = path.resolve('temp_orig.apk');
  if (!fs.existsSync(origApkPath)) {
    console.log('Extracting original base APK from commit 7b922b1...');
    const buf = execSync('git show 7b922b1:app-release.apk', { maxBuffer: 150 * 1024 * 1024 });
    fs.writeFileSync(origApkPath, buf);
    console.log(`Extracted temp_orig.apk (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
  }

  const origData = fs.readFileSync(origApkPath);
  const origZip = await JSZip.loadAsync(origData);

  // Ensure Hermes bytecode bundle exists
  const hbcPath = path.resolve('smartdine-mobile/dist-android/index.android.bundle.hbc');
  if (!fs.existsSync(hbcPath)) {
    throw new Error('index.android.bundle.hbc not found! Compile with hermesc first.');
  }
  const newBundle = fs.readFileSync(hbcPath);
  console.log(`Loaded Hermes bytecode bundle: ${(newBundle.length / 1024 / 1024).toFixed(2)} MB (Magic: ${newBundle.subarray(0, 8).toString('hex')})`);

  // Modify AndroidManifest.xml to set versionCode = 14
  const manifestBuf = await origZip.file('AndroidManifest.xml').async('nodebuffer');
  const modifiedManifest = Buffer.from(manifestBuf);
  
  // Find START_TAG for manifest and update Attr 0 (versionCode)
  for (let i = 0; i < modifiedManifest.length - 20; i += 4) {
    if (modifiedManifest.readUInt32LE(i) === 0x00100102) { // START_TAG
      const attrStart = modifiedManifest.readUInt16LE(i + 24);
      const attrsOffset = i + 16 + attrStart;
      const attr0NameIdx = modifiedManifest.readUInt32LE(attrsOffset + 4);
      if (attr0NameIdx === 26) { // Str 26 is versionCode
        const oldCode = modifiedManifest.readUInt32LE(attrsOffset + 16);
        console.log(`Updating AndroidManifest.xml versionCode: ${oldCode} -> 14`);
        modifiedManifest.writeUInt32LE(14, attrsOffset + 16);
      }
      break;
    }
  }

  const outZip = new JSZip();
  const filePaths = Object.keys(origZip.files);
  console.log(`Processing ${filePaths.length} archive entries...`);

  let storedCount = 0;
  let deflatedCount = 0;

  for (const filePath of filePaths) {
    const entry = origZip.files[filePath];
    if (entry.dir) continue;

    // Strip old META-INF signatures
    if (filePath.startsWith('META-INF/')) continue;

    if (filePath === 'AndroidManifest.xml') {
      outZip.file(filePath, modifiedManifest, {
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });
      deflatedCount++;
      continue;
    }

    if (filePath === 'assets/index.android.bundle') {
      outZip.file(filePath, newBundle, {
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });
      deflatedCount++;
      continue;
    }

    const content = await entry.async('nodebuffer');
    const isStored = (entry._data && entry._data.uncompressedSize === entry._data.compressedSize && entry._data.uncompressedSize > 0)
      || filePath === 'resources.arsc'
      || filePath.endsWith('.so');

    if (isStored) {
      outZip.file(filePath, content, { compression: 'STORE' });
      storedCount++;
    } else {
      outZip.file(filePath, content, {
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });
      deflatedCount++;
    }
  }

  console.log(`Entries categorized: ${storedCount} STORED, ${deflatedCount} DEFLATED`);

  console.log('Generating unsigned APK...');
  const unsignedBuf = await outZip.generateAsync({ type: 'nodebuffer' });
  const unsignedPath = path.resolve('unsigned_production.apk');
  fs.writeFileSync(unsignedPath, unsignedBuf);
  console.log(`Wrote ${unsignedPath} (${(unsignedBuf.length / 1024 / 1024).toFixed(2)} MB)`);

  // Sign and zipalign with uber-apk-signer
  const javaExe = path.resolve('tools/jre/bin/java.exe');
  const signerJar = path.resolve('tools/uber-apk-signer.jar');
  const keystore = path.resolve('smartdine-mobile/androide_backup/app/debug.keystore');

  console.log('Signing and zipaligning with uber-apk-signer...');
  const signCmd = `"${javaExe}" -jar "${signerJar}" -a "${unsignedPath}" --ksDebug "${keystore}" --verbose`;
  const signOutput = execSync(signCmd, { encoding: 'utf-8' });
  console.log(signOutput);

  // Locate the output signed APK
  const signedApk = path.resolve('unsigned_production-aligned-debugSigned.apk');
  if (!fs.existsSync(signedApk)) {
    throw new Error('Signed APK not found after uber-apk-signer run!');
  }

  const stat = fs.statSync(signedApk);
  console.log(`Verified output signed APK: ${signedApk} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  // Deploy to public directory and root
  const destPaths = [
    path.resolve('public/app-release.apk'),
    path.resolve('public/cleverops-mobile.apk'),
    path.resolve('app-release.apk')
  ];

  for (const dest of destPaths) {
    fs.copyFileSync(signedApk, dest);
    console.log(`Copied to ${dest}`);
  }

  console.log('\n=== APK Packaging & Signing COMPLETE ===');
}

packageApk().catch(err => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
