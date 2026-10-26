const fs = require('fs');
const bundle = fs.readFileSync('smartdine-mobile/dist-android/index.android.bundle', 'utf8');

// Find module 549 definition
const m549Idx = bundle.indexOf('549,[');
const m549Start = bundle.lastIndexOf('__d(function', m549Idx);
const m549 = bundle.slice(m549Start, m549Idx + 100);

console.log('m549 total length:', m549.length);

// Print the beginning (first 400 chars)
console.log('--- START ---');
console.log(m549.slice(0, 400));

// Print the end (last 600 chars)
console.log('--- END ---');
console.log(m549.slice(m549.length - 600));
