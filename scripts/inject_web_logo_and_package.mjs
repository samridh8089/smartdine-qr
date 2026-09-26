import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import sharp from 'sharp';
import { execSync } from 'child_process';

async function main() {
  console.log('=== Injecting Web Logo into Production APK & Re-signing ===');

  const baseApkPath = path.resolve('release-rc2/SmartDine-RC2.apk');
  if (!fs.existsSync(baseApkPath)) {
    throw new Error('Base APK not found at: ' + baseApkPath);
  }

  const logoPngPath = path.resolve('public/logo.png');
  const logoBuf = fs.readFileSync(logoPngPath);
  console.log(`Loaded web logo: ${logoPngPath} (${(logoBuf.length / 1024).toFixed(1)} KB)`);

  // Generate icons for all densities
  // Dims: 48, 72, 96, 144, 192
  const icon48 = await sharp(logoBuf).resize(48, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();
  const icon72 = await sharp(logoBuf).resize(72, 72, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();
  const icon96 = await sharp(logoBuf).resize(96, 96, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();
  const icon144 = await sharp(logoBuf).resize(144, 144, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();
  const icon192 = await sharp(logoBuf).resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();

  // Also full-bleed round/square with subtle white background for launcher compatibility
  async function makeLauncher(size) {
    const pad = Math.round(size * 0.1);
    const inner = size - pad * 2;
    const resizedLogo = await sharp(logoBuf).resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).toBuffer();
    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .webp({ quality: 95 })
    .toBuffer();
  }

  const launch48 = await makeLauncher(48);
  const launch72 = await makeLauncher(72);
  const launch96 = await makeLauncher(96);
  const launch144 = await makeLauncher(144);
  const launch192 = await makeLauncher(192);

  // Background white webp
  async function makeBg(size) {
    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();
  }

  const bg48 = await makeBg(48);
  const bg72 = await makeBg(72);
  const bg96 = await makeBg(96);
  const bg144 = await makeBg(144);
  const bg192 = await makeBg(192);

  // Mapping of APK resource names to generated buffers
  const replacements = {
    // Set 1 (Launcher / Foreground)
    'res/yw.webp': launch48,
    'res/fq.webp': launch72,
    'res/u5.webp': launch96,
    'res/j_.webp': launch144,
    'res/-6.webp': launch192,

    // Set 2 (Round Launcher)
    'res/Nt.webp': launch48,
    'res/13.webp': launch72,
    'res/9Q.webp': launch96,
    'res/Sn.webp': launch144,
    'res/5c.webp': launch192,

    // Set 3 (Adaptive Foreground)
    'res/d2.webp': icon48,
    'res/MO.webp': icon72,
    'res/qs.webp': icon96,
    'res/iE.webp': icon144,
    'res/sK.webp': icon192,

    // Backgrounds (PNG formatted despite .webp extension)
    'res/At.webp': bg48,
    'res/4k.webp': bg72,
    'res/By.webp': bg96,
    'res/BZ.webp': bg144,
    'res/gS.webp': bg192,
  };

  console.log('Loading base APK into JSZip...');
  const baseData = fs.readFileSync(baseApkPath);
  const zip = await JSZip.loadAsync(baseData);

  const outZip = new JSZip();
  const filePaths = Object.keys(zip.files);
  console.log(`Processing ${filePaths.length} entries in APK...`);

  let replacedCount = 0;
  for (const filePath of filePaths) {
    const entry = zip.files[filePath];
    if (entry.dir) continue;

    // Strip old signature files
    if (filePath.startsWith('META-INF/')) {
      const relMeta = filePath.substring('META-INF/'.length);
      if (!relMeta.includes('/') && (relMeta === 'MANIFEST.MF' || relMeta.endsWith('.SF') || relMeta.endsWith('.RSA') || relMeta.endsWith('.DSA') || relMeta.endsWith('.EC'))) {
        continue;
      }
    }

    if (replacements[filePath]) {
      outZip.file(filePath, replacements[filePath], { compression: 'DEFLATE', compressionOptions: { level: 9 } });
      replacedCount++;
      continue;
    }

    const content = await entry.async('nodebuffer');
    const isStored = (entry._data && entry._data.uncompressedSize === entry._data.compressedSize && entry._data.uncompressedSize > 0)
      || filePath === 'resources.arsc'
      || filePath.endsWith('.so');

    if (isStored) {
      outZip.file(filePath, content, { compression: 'STORE' });
    } else {
      outZip.file(filePath, content, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
    }
  }

  // Also include assets/logo.png and assets/icon.png
  outZip.file('assets/logo.png', logoBuf, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
  outZip.file('assets/icon.png', logoBuf, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
  outZip.file('assets/splash-icon.png', logoBuf, { compression: 'DEFLATE', compressionOptions: { level: 9 } });

  console.log(`Replaced ${replacedCount} icon entries in APK with web logo!`);

  console.log('Generating unsigned APK...');
  const unsignedBuf = await outZip.generateAsync({ type: 'nodebuffer' });
  const unsignedPath = path.resolve('unsigned_logo.apk');
  fs.writeFileSync(unsignedPath, unsignedBuf);
  console.log(`Wrote ${unsignedPath} (${(unsignedBuf.length / 1024 / 1024).toFixed(2)} MB)`);

  // Sign with uber-apk-signer
  const javaExe = path.resolve('tools/jre/bin/java.exe');
  const signerJar = path.resolve('tools/uber-apk-signer.jar');
  const keystore = path.resolve('smartdine-mobile/androide_backup/app/debug.keystore');

  console.log('Signing APK with uber-apk-signer...');
  const signCmd = `"${javaExe}" -Xms64m -Xmx512m -jar "${signerJar}" -a "${unsignedPath}" --ksDebug "${keystore}" --verbose`;
  const signOutput = execSync(signCmd, { encoding: 'utf-8' });
  console.log(signOutput);

  const signedApk = path.resolve('unsigned_logo-aligned-debugSigned.apk');
  if (!fs.existsSync(signedApk)) {
    throw new Error('Signed APK not found!');
  }

  const stat = fs.statSync(signedApk);
  console.log(`Signed APK created: ${signedApk} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  // Copy to destination paths
  const destPaths = [
    path.resolve('app-release.apk'),
    path.resolve('public/app-release.apk'),
    path.resolve('public/cleverops-mobile.apk')
  ];

  for (const dest of destPaths) {
    fs.copyFileSync(signedApk, dest);
    console.log(`Updated ${dest}`);
  }

  // Install on connected Android device via ADB
  console.log('Installing on connected Android device...');
  try {
    const installOut = execSync('adb install -r -d app-release.apk', { encoding: 'utf-8', timeout: 60000 });
    console.log('ADB Install Output:', installOut);

    console.log('Launching app...');
    execSync('adb shell am start -n com.smartdine.mobile/.MainActivity', { encoding: 'utf-8' });
    console.log('App launched successfully!');
  } catch (adbErr) {
    console.warn('ADB command failed or device timed out:', adbErr.message);
  }

  console.log('=== Completed Successfully! ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
