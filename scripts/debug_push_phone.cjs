const fs = require('fs');
const JSZip = require('jszip');
const { execSync } = require('child_process');
const path = require('path');

async function pushToPhone() {
  console.log('1. Updating universal APK bundle...');
  const apkPath = path.resolve('CleverOps-universal.apk');
  const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle');
  
  const zip = await JSZip.loadAsync(fs.readFileSync(apkPath));
  zip.file('assets/index.android.bundle', bundle);
  
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 1 } });
  fs.writeFileSync('temp_debug.apk', buf);
  
  console.log('2. Signing with debug key...');
  const java = path.resolve('tools/jdk-17.0.20.1+1/bin/java.exe');
  const signer = path.resolve('tools/uber-apk-signer.jar');
  const ks = path.resolve('tools/debug.keystore');
  execSync(`"${java}" -jar "${signer}" -a temp_debug.apk --ksDebug "${ks}" --allowResign --overwrite`, { stdio: 'inherit' });
  
  console.log('3. Installing to phone via adb...');
  const adb = path.resolve('tools/platform-tools/adb.exe');
  // First uninstall old app if signatures differ
  try {
    execSync(`"${adb}" install -r -d temp_debug.apk`, { stdio: 'inherit' });
  } catch (e) {
    console.log('Install failed, uninstalling old package and reinstalling...');
    execSync(`"${adb}" uninstall cleverops.app.in`, { stdio: 'inherit' });
    execSync(`"${adb}" install temp_debug.apk`, { stdio: 'inherit' });
  }
  
  console.log('4. Launching app on phone...');
  execSync(`"${adb}" logcat -c`, { stdio: 'inherit' });
  execSync(`"${adb}" shell am start -n cleverops.app.in/com.smartdine.mobile.MainActivity`, { stdio: 'inherit' });
  
  console.log('Done launching!');
}
pushToPhone().catch(console.error);
