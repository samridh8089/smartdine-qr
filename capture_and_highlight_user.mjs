import { execSync } from 'child_process';
import sharp from 'sharp';
import fs from 'fs';

const DEVICE_SERIAL = 'RZCW80KCC8B';

async function captureAndHighlight() {
  console.log('=== CAPTURING AND HIGHLIGHTING USER REQUESTED SCREENSHOT ===\n');

  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell cmd statusbar expand-notifications`);
    await new Promise(r => setTimeout(r, 600));
    execSync(`adb -s ${DEVICE_SERIAL} shell screencap -p /data/local/tmp/user_shade.png`);
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/user_shade.png user_shade.png`);
    console.log('Successfully pulled fresh status bar shade screenshot!');
  } catch (e) {
    console.log('ADB Capture Warning:', e.message);
  }

  const imagePath = 'user_shade.png';
  const outputPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_user_requested.png';

  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width || 1080;
  const height = metadata.height || 2340;

  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect x="30" y="240" width="${width - 60}" height="320" rx="20" ry="20"
            fill="none" stroke="#ef4444" stroke-width="10" stroke-dasharray="16,8" />
      <circle cx="${width / 2}" cy="400" r="160" fill="rgba(239, 68, 68, 0.15)" stroke="#dc2626" stroke-width="8" />
      <rect x="${width / 2 - 250}" y="170" width="500" height="60" rx="10" fill="#dc2626" />
      <text x="${width / 2}" y="210" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">
        🔴 LIVE DEVICE NOTIFICATION TRAY
      </text>
    </svg>
  `);

  await sharp(imagePath)
    .composite([{ input: svgOverlay }])
    .toFile(outputPath);

  console.log('Successfully saved highlighted screenshot to brain directory!');
}

captureAndHighlight();
