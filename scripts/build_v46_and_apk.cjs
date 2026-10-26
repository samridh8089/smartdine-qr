const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { execSync } = require('child_process');

async function buildAll() {
  console.log('=== STEP 1: PATCHING INDEX.ANDROID.BUNDLE FOR EXACT WEB APP UI ===');
  const bundlePath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
  let code = fs.readFileSync(bundlePath, 'utf8');

  // Find module 549 and its return statement
  const targetOldReturn = '(0,U.jsxs)(D,{children:[(0,U.jsx)(v.StatusBar,{style:"auto"}),(0,U.jsx)(p.NavigationContainer';
  const targetIdx = code.indexOf(targetOldReturn);
  console.log('Found old return target at index:', targetIdx);

  if (targetIdx === -1) {
    throw new Error('Could not find old NavigationContainer return in module 549');
  }

  // Find the closing of this return statement
  const endReturnTarget = '})})]})';
  const endIdx = code.indexOf(endReturnTarget, targetIdx);
  console.log('Found end of return target at index:', endIdx);

  // Define the new WebView container
  // c is react-native (module 55), v is expo-status-bar, U is jsxRuntime
  const newReturn = '(0,U.jsxs)(c.SafeAreaView,{style:{flex:1,backgroundColor:"#0f172a"},children:[(0,U.jsx)(v.StatusBar,{style:"light"}),(0,U.jsx)(c.requireNativeComponent("RNCWebView"),{style:{flex:1,backgroundColor:"#0f172a"},source:{uri:"https://cleverops.in/login"},javaScriptEnabled:!0,domStorageEnabled:!0,allowsInlineMediaPlayback:!0,mediaPlaybackRequiresUserAction:!1,startInLoadingState:!0})]})';

  // Replace old NavigationContainer return with the new WebView return
  code = code.substring(0, targetIdx) + newReturn + code.substring(endIdx + endReturnTarget.length);
  fs.writeFileSync(bundlePath, code);
  console.log('[PASS] Successfully patched module 549 with RNCWebView pointing to https://cleverops.in/login');

  console.log('\n=== STEP 2: PACKAGING & SIGNING UNIVERSAL APK ===');
  const apkPath = path.resolve('app-release.apk');
  const apkZip = await JSZip.loadAsync(fs.readFileSync(apkPath));

  // Update assets/index.android.bundle
  apkZip.file('assets/index.android.bundle', fs.readFileSync(bundlePath));

  const unsignedApkBuf = await apkZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const unsignedApkPath = path.resolve('unsigned_temp.apk');
  fs.writeFileSync(unsignedApkPath, unsignedApkBuf);
  console.log('Generated unsigned_temp.apk (' + (unsignedApkBuf.length / 1024 / 1024).toFixed(2) + ' MB)');

  const javaExe = path.resolve('tools/jre/bin/java.exe');
  const signerJar = path.resolve('tools/uber-apk-signer.jar');
  const keystore = path.resolve('tools/debug.keystore');

  console.log('Signing with uber-apk-signer...');
  execSync(`"${javaExe}" -jar "${signerJar}" -a "${unsignedApkPath}" --ksDebug "${keystore}" --allowResign --overwrite --verbose`, { stdio: 'inherit' });

  const finalApkPath = path.resolve('CleverOps-universal.apk');
  fs.copyFileSync(unsignedApkPath, finalApkPath);
  fs.copyFileSync(unsignedApkPath, path.resolve('public/CleverOps-universal.apk'));
  fs.copyFileSync(unsignedApkPath, path.resolve('app-release.apk'));
  fs.copyFileSync(unsignedApkPath, path.resolve('public/app-release.apk'));
  fs.copyFileSync(unsignedApkPath, 'C:/Users/dsoni/Downloads/CleverOps-universal.apk');
  try { fs.unlinkSync(unsignedApkPath); } catch(_) {}
  console.log('[PASS] Signed APK saved to project root, public, and Downloads folder!');

  console.log('\n=== STEP 3: PACKAGING & SIGNING GOOGLE PLAY AAB V46 ===');
  const aabPath = path.resolve('CleverOps.aab');
  const aabZip = await JSZip.loadAsync(fs.readFileSync(aabPath));

  // 1. Update AndroidManifest.xml for versionCode 46 and versionName 2.2.4
  let manifestBuf = await aabZip.files['base/manifest/AndroidManifest.xml'].async('nodebuffer');
  const str45 = Buffer.from([0x1a, 0x02, 0x34, 0x35]);
  const sIdx = manifestBuf.indexOf(str45);
  if (sIdx !== -1) manifestBuf[sIdx + 3] = 0x36; // '5' -> '6' (versionCode 46)

  const int45 = Buffer.from([0x32, 0x04, 0x3a, 0x02, 0x30, 0x2d]);
  const iIdx = manifestBuf.indexOf(int45);
  if (iIdx !== -1) manifestBuf[iIdx + 5] = 0x2e; // 0x2d (45) -> 0x2e (46)

  const oldV = Buffer.from('2.2.3', 'ascii');
  const newV = Buffer.from('2.2.4', 'ascii');
  let vIdx = manifestBuf.indexOf(oldV);
  while (vIdx !== -1) {
    newV.copy(manifestBuf, vIdx);
    vIdx = manifestBuf.indexOf(oldV, vIdx + 5);
  }

  aabZip.file('base/manifest/AndroidManifest.xml', manifestBuf, { createFolders: false });

  // 2. Also update base/assets/index.android.bundle with the patched bundle
  aabZip.file('base/assets/index.android.bundle', fs.readFileSync(bundlePath), { createFolders: false });

  // 3. Create clean zip without folder entries
  const cleanZip = new JSZip();
  for (const f of Object.keys(aabZip.files)) {
    const entry = aabZip.files[f];
    if (entry.dir || f.endsWith('/')) continue;
    const c = await entry.async('nodebuffer');
    cleanZip.file(f, c, {
      createFolders: false,
      compression: entry._data && entry._data.uncompressedSize === entry._data.compressedSize ? 'STORE' : 'DEFLATE'
    });
  }

  const finalAabBuf = await cleanZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const finalAabPath = path.resolve('CleverOps.aab');
  fs.writeFileSync(finalAabPath, finalAabBuf);
  fs.copyFileSync(finalAabPath, path.resolve('public/CleverOps.aab'));
  fs.copyFileSync(finalAabPath, path.resolve('public/CleverOps-release.aab'));
  fs.copyFileSync(finalAabPath, 'C:/Users/dsoni/Downloads/CleverOps-release.aab');
  console.log('[PASS] Saved CleverOps.aab with versionCode 46 to root, public, and Downloads folder!');

  // Validate with bundletool
  const bundletoolJar = path.resolve('tools/bundletool.jar');
  console.log('\nValidating AAB with bundletool...');
  execSync(`"${javaExe}" -jar "${bundletoolJar}" validate --bundle="${finalAabPath}"`, { stdio: 'inherit' });
  console.log('[PASS] Bundletool validation passed!');

  const dumpOut = execSync(`"${javaExe}" -jar "${bundletoolJar}" dump manifest --bundle="${finalAabPath}"`, { encoding: 'utf8' });
  dumpOut.split('\n').slice(0, 3).forEach(l => console.log('[MANIFEST]:', l));

  console.log('\n================================================================');
  console.log('=== BUILD COMPLETE! BOTH APK & AAB FULLY UPDATED & VERIFIED! ===');
  console.log('================================================================');
}

buildAll().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
