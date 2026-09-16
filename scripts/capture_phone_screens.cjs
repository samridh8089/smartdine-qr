const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = 'C:\\Users\\admin\\platform-tools\\adb.exe';

function runAdb(args, outputFile = null) {
  if (outputFile) {
    execSync(`"${ADB}" ${args} > "${outputFile}"`, { stdio: ['ignore', 'pipe', 'inherit'] });
  } else {
    return execSync(`"${ADB}" ${args}`, { encoding: 'utf8' }).trim();
  }
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function main() {
  console.log('Verifying connected device...');
  const devices = runAdb('devices');
  console.log(devices);

  console.log('Ensuring SmartDine app is running and brought to foreground...');
  runAdb('shell am start -n com.smartdine.mobile/.MainActivity');
  await sleep(2500);

  // Take screenshot 1: Overview
  console.log('Capturing 1: Dashboard Overview...');
  execSync(`"${ADB}" exec-out screencap -p > phone_overview.png`);
  console.log('Saved phone_overview.png');

  // Tap Orders tab (approx x=432, y=2850 on 1440x3088)
  console.log('Tapping Orders tab...');
  runAdb('shell input tap 432 2850');
  await sleep(2000);
  console.log('Capturing 2: Orders screen...');
  execSync(`"${ADB}" exec-out screencap -p > phone_orders.png`);
  console.log('Saved phone_orders.png');

  // Tap Punch Order tab (approx x=720, y=2850)
  console.log('Tapping Punch / Menu tab...');
  runAdb('shell input tap 720 2850');
  await sleep(2000);
  console.log('Capturing 3: Punch Order / Menu screen...');
  execSync(`"${ADB}" exec-out screencap -p > phone_punch.png`);
  console.log('Saved phone_punch.png');

  // Tap Kitchen (KDS) tab (approx x=1008, y=2850)
  console.log('Tapping Kitchen (KDS) tab...');
  runAdb('shell input tap 1008 2850');
  await sleep(2000);
  console.log('Capturing 4: Kitchen / KDS screen...');
  execSync(`"${ADB}" exec-out screencap -p > phone_kitchen.png`);
  console.log('Saved phone_kitchen.png');

  // Tap More / Account tab (approx x=1280, y=2850)
  console.log('Tapping Account / Settings tab...');
  runAdb('shell input tap 1280 2850');
  await sleep(2000);
  console.log('Capturing 5: Account / Settings screen...');
  execSync(`"${ADB}" exec-out screencap -p > phone_account.png`);
  console.log('Saved phone_account.png');

  console.log('\n--- Phone Verification Summary ---');
  ['phone_overview.png', 'phone_orders.png', 'phone_punch.png', 'phone_kitchen.png', 'phone_account.png'].forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`[PASS] ${file}: ${stats.size} bytes`);
    } else {
      console.log(`[FAIL] ${file} not found`);
    }
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
