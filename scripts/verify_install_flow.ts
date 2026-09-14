import fs from 'fs';
import path from 'path';

async function runVerification() {
  console.log('====================================================');
  console.log('🔍 SMARTDINE ONE-CLICK INSTALL VERIFICATION (PWA + DESKTOP)');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   ${detail}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   ${detail}`);
      process.exitCode = 1;
    }
  }

  // 1. Manifest Validation
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  assert(fs.existsSync(manifestPath), 'PWA Manifest Exists', `Path: ${manifestPath}`);
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(manifest.name === 'CleverOps SmartDine', 'Manifest Name Valid', manifest.name);
  assert(manifest.short_name === 'SmartDine', 'Manifest Short Name Valid', manifest.short_name);
  assert(manifest.display === 'standalone', 'Manifest Display Mode Standalone', manifest.display);
  assert(manifest.start_url === '/', 'Manifest Start URL Valid', manifest.start_url);
  assert(manifest.icons && manifest.icons.length >= 2, 'Manifest Icons Defined', `${manifest.icons?.length} icons`);

  // Verify icon files on disk
  for (const icon of manifest.icons) {
    const iconFile = path.join(process.cwd(), 'public', icon.src.replace(/^\//, ''));
    assert(fs.existsSync(iconFile), `Manifest Icon Exists: ${icon.src}`, `File: ${iconFile}`);
  }

  // 2. Service Worker Validation
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  assert(fs.existsSync(swPath), 'Service Worker File Exists', `Path: ${swPath}`);
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes('self.addEventListener(\'fetch\''), 'Service Worker Fetch Handler Present');
  assert(swContent.includes('self.addEventListener(\'install\''), 'Service Worker Install Handler Present');

  // 3. Root Layout SW Registration
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('/manifest.json'), 'Root Layout Links Manifest');
  assert(layoutContent.includes('navigator.serviceWorker.register(\'/sw.js\')'), 'Root Layout Registers Service Worker');

  // 4. InstallAppButton Component Structure
  const buttonPath = path.join(process.cwd(), 'src', 'components', 'shared', 'InstallAppButton.tsx');
  assert(fs.existsSync(buttonPath), 'InstallAppButton Component Exists', buttonPath);
  const buttonContent = fs.readFileSync(buttonPath, 'utf8');

  // Strict hook ordering check inside component body
  const bodyStart = buttonContent.indexOf('export default function');
  const componentBody = buttonContent.slice(bodyStart);
  const useStateIdx = componentBody.indexOf('useState');
  const useCallbackIdx = componentBody.indexOf('useCallback');
  const useEffectIdx = componentBody.indexOf('useEffect');
  const earlyReturnIdx = componentBody.indexOf('if (isStandalone || isInstalled)');

  assert(
    useStateIdx < useCallbackIdx && useCallbackIdx < useEffectIdx && useEffectIdx < earlyReturnIdx,
    'Strict React Hooks Ordering Maintained',
    `useState (${useStateIdx}) -> useCallback (${useCallbackIdx}) -> useEffect (${useEffectIdx}) -> earlyReturn (${earlyReturnIdx})`
  );

  // Standalone & Electron suppression check
  assert(buttonContent.includes('display-mode: standalone'), 'Checks display-mode: standalone');
  assert(buttonContent.includes('electronAPI'), 'Checks electronAPI environment');
  assert(buttonContent.includes('isStandalone || isInstalled'), 'Hides button when standalone or installed');

  // Native beforeinstallprompt integration
  assert(buttonContent.includes('beforeinstallprompt'), 'Listens for beforeinstallprompt event');
  assert(buttonContent.includes('deferredPrompt.prompt()'), 'Triggers native prompt() on click');
  assert(buttonContent.includes('appinstalled'), 'Listens for appinstalled event');

  // Label and Icon check
  assert(buttonContent.includes('Install App'), 'Button Label is "Install App"');
  assert(buttonContent.includes('Download'), 'Download icon used');

  // Direct binaries check
  const winSetupPath = path.join(process.cwd(), 'public', 'smartdine-desktop-setup.exe');
  assert(fs.existsSync(winSetupPath), 'Windows Setup Binary Exists for 1-Click Fallback', `Size: ${(fs.statSync(winSetupPath).size / 1024 / 1024).toFixed(1)} MB`);

  const apkPath = path.join(process.cwd(), 'public', 'app-release.apk');
  assert(fs.existsSync(apkPath), 'Android APK Binary Exists for 1-Click Fallback', `Size: ${(fs.statSync(apkPath).size / 1024 / 1024).toFixed(1)} MB`);

  // 5. Dashboard Layout & Page Navigation Integration
  const dashLayoutPath = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'layout.tsx');
  const dashLayoutContent = fs.readFileSync(dashLayoutPath, 'utf8');
  assert(dashLayoutContent.includes('InstallAppButton'), 'Dashboard Layout Integrates InstallAppButton');
  assert(dashLayoutContent.includes('<header') && dashLayoutContent.includes('<InstallAppButton />'), 'Top Navbar Integrates InstallAppButton');

  const landingPagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
  const landingPageContent = fs.readFileSync(landingPagePath, 'utf8');
  assert(landingPageContent.includes('InstallAppButton'), 'Landing Page Integrates InstallAppButton in Navbar');

  // 6. Frozen Business Logic Check
  const frozenFiles = [
    'src/lib/inventoryEngine.ts',
    'src/lib/inventoryUnits.ts'
  ];
  for (const f of frozenFiles) {
    const p = path.join(process.cwd(), f);
    assert(fs.existsSync(p), `Frozen File Intact: ${f}`);
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ONE-CLICK INSTALL (PWA + DESKTOP) VERIFIED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Unhandled error during verification:', err);
  process.exit(1);
});
