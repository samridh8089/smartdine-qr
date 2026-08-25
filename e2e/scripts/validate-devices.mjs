// Validation script — checks all device presets used in playwright.config.ts
// Run: node e2e/scripts/validate-devices.mjs
import { devices } from '@playwright/test';

const toCheck = [
  'Pixel 7',
  'iPhone 15',
  'iPhone SE',
  'iPad (gen 7)',
  'Desktop Chrome',
  'Desktop Firefox',
  'Desktop Edge',
  'Desktop Safari',
];

let allOk = true;
for (const name of toCheck) {
  const d = devices[name];
  if (!d) {
    console.error(`MISSING: devices['${name}']`);
    allOk = false;
  } else {
    const viewport = d.viewport ? `${d.viewport.width}x${d.viewport.height}` : 'inherited';
    const ua = (d.userAgent || '').slice(0, 60);
    const touch = d.hasTouch ? 'touch=yes' : 'touch=no';
    console.log(`OK  devices['${name}']  viewport=${viewport}  ${touch}`);
    if (d.userAgent) console.log(`    UA: ${ua}...`);
  }
}

console.log('');
if (allOk) {
  console.log('✅ All device presets validated successfully.');
} else {
  console.error('❌ Some device presets are missing.');
  process.exit(1);
}
