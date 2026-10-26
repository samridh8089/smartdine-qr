const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
let bundle = fs.readFileSync(bundlePath, 'utf8');

// Remove the [PHONE_TEST] console.log
const logStr = '(console.log("[PHONE_TEST] c is:", typeof c, "requireNativeComponent is:", typeof c.requireNativeComponent, "RNCWebView is:", typeof c.requireNativeComponent("RNCWebView")),';
if (bundle.includes(logStr)) {
  bundle = bundle.replace(logStr, '');
  fs.writeFileSync(bundlePath, bundle);
  console.log('Cleaned up debug log from bundle successfully!');
} else {
  console.log('Debug log not found, bundle already clean.');
}
