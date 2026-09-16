const { execSync } = require('child_process');
const adb = 'C:\\Users\\admin\\platform-tools\\adb.exe';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Tapping Overview tab at 120, 2850...');
  execSync(`"${adb}" shell input tap 120 2850`);
  await sleep(2500);
  execSync(`"${adb}" exec-out screencap -p > phone_overview_clean.png`);
  console.log('Captured phone_overview_clean.png');

  console.log('Tapping Punch tab at 600, 2850 (or Reports at 1050)...');
  execSync(`"${adb}" shell input tap 600 2850`);
  await sleep(2500);
  execSync(`"${adb}" exec-out screencap -p > phone_punch_clean.png`);
  console.log('Captured phone_punch_clean.png');

  console.log('Tapping Reports tab at 1050, 2850...');
  execSync(`"${adb}" shell input tap 1050 2850`);
  await sleep(2500);
  execSync(`"${adb}" exec-out screencap -p > phone_reports_clean.png`);
  console.log('Captured phone_reports_clean.png');
}

run().catch(console.error);
