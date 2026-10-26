const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');
const idx = bundle.indexOf('cleverops.in/login');
console.log('--- BEFORE ---');
console.log(bundle.slice(Math.max(0, idx - 500), idx));
console.log('--- AFTER ---');
console.log(bundle.slice(idx, idx + 500));
