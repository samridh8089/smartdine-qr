import { execSync } from 'child_process';
import fs from 'fs';

const DEVICE_SERIAL = 'RZCW80KCC8B';

async function captureExpandedShade() {
  console.log('=== CAPTURING EXPANDED NOTIFICATION SHADE ===\n');

  try {
    // 1. Expand notification status bar
    execSync(`adb -s ${DEVICE_SERIAL} shell cmd statusbar expand-notifications`);
  } catch (e) {
    console.log('Expand error:', e.message);
  }

  await new Promise(r => setTimeout(r, 1200));

  try {
    // 2. Take screenshot of expanded shade
    execSync(`adb -s ${DEVICE_SERIAL} shell screencap -p /data/local/tmp/expanded_shade.png`);
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/expanded_shade.png screenshot_expanded_shade.png`);
    
    const targetPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_expanded_shade.png';
    fs.copyFileSync('screenshot_expanded_shade.png', targetPath);
    console.log('Successfully saved expanded notification shade screenshot!');
  } catch (e) {
    console.log('Capture error:', e.message);
  }
}

captureExpandedShade();
