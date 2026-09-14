import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('📱 SMARTDINE 2-PASS INSTALL PROOF SIMULATION');
console.log('   Windows Desktop + Android Mobile Flow');
console.log('====================================================\n');

interface MockEvent {
  type: string;
  defaultPrevented?: boolean;
  preventDefault: () => void;
  prompt?: () => void;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

class BrowserContextSimulator {
  public platform: 'windows' | 'android';
  public isStandalone: boolean = false;
  public isElectron: boolean = false;
  public isInstalledStorage: boolean = false;
  public hasRelatedAppInstalled: boolean = false;
  public eventListeners: Record<string, ((e: any) => void)[]> = {};

  // Component state mirrors InstallAppButton
  public deferredPrompt: any = null;
  public isInstalledState: boolean = false;
  public isStandaloneState: boolean = false;
  public promptCalled: boolean = false;
  public installSuccessNotified: boolean = false;
  public modalShown: boolean = false;

  constructor(platform: 'windows' | 'android', standalone = false, electron = false) {
    this.platform = platform;
    this.isStandalone = standalone;
    this.isElectron = electron;
  }

  public addEventListener(event: string, handler: (e: any) => void) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }

  public dispatchEvent(event: MockEvent) {
    const handlers = this.eventListeners[event.type] || [];
    for (const h of handlers) h(event);
  }

  public mountComponent() {
    // Mirror checkStandalone
    if (this.isStandalone || this.isElectron) {
      this.isStandaloneState = true;
    }

    if (this.hasRelatedAppInstalled) {
      this.isInstalledState = true;
    }

    // Register event listeners
    this.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });

    this.addEventListener('appinstalled', () => {
      this.isInstalledState = true;
      this.deferredPrompt = null;
      this.installSuccessNotified = true;
    });
  }

  public isButtonVisible(): boolean {
    return !(this.isStandaloneState || this.isInstalledState);
  }

  public async clickInstallApp() {
    if (this.deferredPrompt) {
      this.promptCalled = true;
      this.deferredPrompt.prompt();
      const res = await this.deferredPrompt.userChoice;
      if (res && res.outcome === 'accepted') {
        this.isInstalledState = true;
        this.deferredPrompt = null;
        this.installSuccessNotified = true;
      }
    } else {
      this.modalShown = true;
    }
  }
}

async function runPasses() {
  let passes = 0;
  let total = 0;

  function verify(cond: boolean, desc: string, detail?: string) {
    total++;
    if (cond) {
      console.log(`  ✅ [PASS] ${desc}`);
      if (detail) console.log(`     ${detail}`);
      passes++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      if (detail) console.error(`     ${detail}`);
      process.exitCode = 1;
    }
  }

  // ==========================================
  // PASS 1: WINDOWS INSTALL FLOW
  // ==========================================
  console.log('--- PASS 1: WINDOWS DESKTOP INSTALLATION PROOF ---');

  // Step 1: User visits SmartDine in Windows browser (Chrome / Edge)
  const winBrowser = new BrowserContextSimulator('windows', false, false);
  winBrowser.mountComponent();
  verify(winBrowser.isButtonVisible() === true, '1.1 Windows Browser: Install App button is VISIBLE');

  // Step 2: Browser fires beforeinstallprompt
  let winPromptTriggered = false;
  winBrowser.dispatchEvent({
    type: 'beforeinstallprompt',
    preventDefault: () => {},
    prompt: () => { winPromptTriggered = true; },
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
  });
  verify(winBrowser.deferredPrompt !== null, '1.2 Windows Browser: beforeinstallprompt intercepted and captured');

  // Step 3: User clicks "Install App" in top navbar/profile menu
  await winBrowser.clickInstallApp();
  verify(winPromptTriggered === true, '1.3 Windows Browser: Native install popup dialog PROMPTED to user');
  verify(winBrowser.isInstalledState === true, '1.4 Windows Browser: User accepted install, state updated');

  // Step 4: Browser dispatches appinstalled event
  winBrowser.dispatchEvent({ type: 'appinstalled', preventDefault: () => {} });
  verify(winBrowser.isButtonVisible() === false, '1.5 Windows Browser: Install App button is immediately HIDDEN');
  verify(winBrowser.installSuccessNotified === true, '1.6 Windows Browser: Install success notification triggered');

  // Step 5: User launches installed app from Windows Desktop Icon (PWA Standalone)
  const winPWA = new BrowserContextSimulator('windows', true, false);
  winPWA.mountComponent();
  verify(winPWA.isButtonVisible() === false, '1.7 Windows PWA (Desktop Launch): Button remains HIDDEN in standalone window');

  // Step 6: User launches native Electron app
  const winElectron = new BrowserContextSimulator('windows', false, true);
  winElectron.mountComponent();
  verify(winElectron.isButtonVisible() === false, '1.8 Windows Electron (Desktop Launch): Button remains HIDDEN in desktop shell');

  // ==========================================
  // PASS 2: ANDROID MOBILE INSTALL FLOW
  // ==========================================
  console.log('\n--- PASS 2: ANDROID CHROME MOBILE INSTALLATION PROOF ---');

  // Step 1: User visits SmartDine in Android Chrome
  const androidBrowser = new BrowserContextSimulator('android', false, false);
  androidBrowser.mountComponent();
  verify(androidBrowser.isButtonVisible() === true, '2.1 Android Chrome: Install App button is VISIBLE in mobile navbar/drawer');

  // Step 2: Android Chrome triggers beforeinstallprompt
  let androidPromptTriggered = false;
  androidBrowser.dispatchEvent({
    type: 'beforeinstallprompt',
    preventDefault: () => {},
    prompt: () => { androidPromptTriggered = true; },
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'android' })
  });
  verify(androidBrowser.deferredPrompt !== null, '2.2 Android Chrome: beforeinstallprompt intercepted and captured');

  // Step 3: User taps "Install App"
  await androidBrowser.clickInstallApp();
  verify(androidPromptTriggered === true, '2.3 Android Chrome: Native "Add to Home screen / Install" popup displayed');
  verify(androidBrowser.isInstalledState === true, '2.4 Android Chrome: User accepted install');

  // Step 4: Chrome fires appinstalled
  androidBrowser.dispatchEvent({ type: 'appinstalled', preventDefault: () => {} });
  verify(androidBrowser.isButtonVisible() === false, '2.5 Android Chrome: Button is HIDDEN immediately after installation');

  // Step 5: User opens app from Android Home Screen icon (standalone)
  const androidHomeScreenApp = new BrowserContextSimulator('android', true, false);
  androidHomeScreenApp.mountComponent();
  verify(androidHomeScreenApp.isButtonVisible() === false, '2.6 Android Home Screen (Launched): Button is completely HIDDEN');

  // Step 6: User revisits browser with getInstalledRelatedApps reporting app installed
  const androidRevisit = new BrowserContextSimulator('android', false, false);
  androidRevisit.hasRelatedAppInstalled = true;
  androidRevisit.mountComponent();
  verify(androidRevisit.isButtonVisible() === false, '2.7 Android Chrome (Revisit): getInstalledRelatedApps hides install button');

  // ==========================================
  // DIRECT 1-CLICK BINARY DOWNLOAD FALLBACK
  // ==========================================
  console.log('\n--- 1-CLICK DIRECT BINARY FALLBACK PROOF ---');
  const fallbackBrowser = new BrowserContextSimulator('windows', false, false);
  fallbackBrowser.mountComponent();
  // No beforeinstallprompt available
  await fallbackBrowser.clickInstallApp();
  verify(fallbackBrowser.modalShown === true, '3.1 Fallback modal opened when native prompt is unavailable');

  const winSetupFile = path.join(process.cwd(), 'public', 'smartdine-desktop-setup.exe');
  verify(fs.existsSync(winSetupFile), '3.2 Windows setup binary exists at /smartdine-desktop-setup.exe');
  
  const androidApkFile = path.join(process.cwd(), 'public', 'app-release.apk');
  verify(fs.existsSync(androidApkFile), '3.3 Android APK exists at /app-release.apk');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passes}/${total} Install Flow Tests Passed (${Math.round((passes / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passes === total) {
    console.log('🎉 ALL INSTALL FLOW PASSES VERIFIED CLEANLY!');
  } else {
    process.exit(1);
  }
}

runPasses().catch(err => {
  console.error(err);
  process.exit(1);
});
