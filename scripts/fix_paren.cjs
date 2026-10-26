const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
let bundle = fs.readFileSync(bundlePath, 'utf8');

const target = 'startInLoadingState:!0})]}))';
const replacement = 'startInLoadingState:!0})]})';

if (bundle.includes(target)) {
  bundle = bundle.replace(target, replacement);
  fs.writeFileSync(bundlePath, bundle);
  console.log('Fixed extra parenthesis successfully!');
} else {
  console.log('Target not found, checking context:');
  const idx = bundle.indexOf('startInLoadingState:!0');
  if (idx !== -1) {
    console.log(bundle.slice(idx, idx + 40));
  }
}
