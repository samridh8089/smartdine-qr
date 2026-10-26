const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
let code = fs.readFileSync(bundlePath, 'utf8');

// In module 549, inside _e.default, let's log the exact types
const target = 'children:[(0,U.jsx)(v.StatusBar';
const replacement = 'children:[(console.log("[DEBUG_TYPES]", "RN:", typeof RN, "SafeAreaView:", typeof (RN&&RN.SafeAreaView), "v:", typeof v, "StatusBar:", typeof (v&&v.StatusBar), "RNCWebView:", typeof RNCWebView)),(0,U.jsx)(v.StatusBar';

if (!code.includes(target)) {
  console.error('Target not found in bundle!');
} else {
  code = code.replace(target, replacement);
  fs.writeFileSync(bundlePath, code);
  console.log('Successfully injected debug console.log into bundle!');
}
